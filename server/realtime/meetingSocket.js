const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function createMeetingSocket(io) {
  const rooms = new Map();

  const getRoom = (roomId) => {
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map());
    }
    return rooms.get(roomId);
  };

  const serializeParticipant = (socketId, participant) => ({
    socketId,
    userId: participant.userId,
    userName: participant.userName,
    role: participant.role,
    micEnabled: participant.micEnabled,
    cameraEnabled: participant.cameraEnabled,
    mutedByAdmin: participant.mutedByAdmin
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication token is required'));
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = decoded;
      return next();
    } catch (error) {
      return next(new Error('Invalid authentication token'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('join-room', ({ roomId, userName }) => {
      if (!roomId) return;

      const room = getRoom(roomId);
      const participant = {
        userId: socket.user.id,
        userName: userName || socket.user.email || 'User',
        role: socket.user.role,
        micEnabled: true,
        cameraEnabled: true,
        mutedByAdmin: false
      };

      room.set(socket.id, participant);
      socket.join(roomId);
      socket.data.roomId = roomId;

      const existingParticipants = [];
      room.forEach((value, key) => {
        if (key !== socket.id) {
          existingParticipants.push(serializeParticipant(key, value));
        }
      });

      socket.emit('room-participants', existingParticipants);
      socket.to(roomId).emit('participant-joined', serializeParticipant(socket.id, participant));
    });

    socket.on('participant-state', ({ micEnabled, cameraEnabled }) => {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      const room = rooms.get(roomId);
      if (!room || !room.has(socket.id)) return;

      const participant = room.get(socket.id);
      participant.micEnabled = Boolean(micEnabled);
      participant.cameraEnabled = Boolean(cameraEnabled);
      room.set(socket.id, participant);

      socket.to(roomId).emit('participant-updated', serializeParticipant(socket.id, participant));
    });

    socket.on('webrtc-offer', ({ targetSocketId, offer }) => {
      if (!targetSocketId || !offer) return;
      io.to(targetSocketId).emit('webrtc-offer', {
        fromSocketId: socket.id,
        offer
      });
    });

    socket.on('webrtc-answer', ({ targetSocketId, answer }) => {
      if (!targetSocketId || !answer) return;
      io.to(targetSocketId).emit('webrtc-answer', {
        fromSocketId: socket.id,
        answer
      });
    });

    socket.on('webrtc-ice-candidate', ({ targetSocketId, candidate }) => {
      if (!targetSocketId || !candidate) return;
      io.to(targetSocketId).emit('webrtc-ice-candidate', {
        fromSocketId: socket.id,
        candidate
      });
    });

    socket.on('admin-mute-patient', ({ targetSocketId }) => {
      const roomId = socket.data.roomId;
      if (!roomId || !targetSocketId) return;

      const room = rooms.get(roomId);
      if (!room || !room.has(socket.id) || !room.has(targetSocketId)) return;

      const admin = room.get(socket.id);
      const target = room.get(targetSocketId);

      if (admin.role !== 'admin' || target.role !== 'patient') return;

      target.micEnabled = false;
      target.mutedByAdmin = true;
      room.set(targetSocketId, target);

      io.to(targetSocketId).emit('force-muted-by-admin');
      io.to(roomId).emit('participant-updated', serializeParticipant(targetSocketId, target));
    });

    socket.on('admin-end-meeting', () => {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      const room = rooms.get(roomId);
      if (!room || !room.has(socket.id)) return;

      const admin = room.get(socket.id);
      if (admin.role !== 'admin') return;

      io.to(roomId).emit('meeting-ended', {
        endedBy: admin.userName || 'Admin'
      });

      room.forEach((_, participantSocketId) => {
        const participantSocket = io.sockets.sockets.get(participantSocketId);
        if (participantSocket) {
          participantSocket.leave(roomId);
          participantSocket.data.roomId = null;
        }
      });

      rooms.delete(roomId);
    });

    socket.on('disconnect', () => {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      const room = rooms.get(roomId);
      if (!room || !room.has(socket.id)) return;

      room.delete(socket.id);
      socket.to(roomId).emit('participant-left', { socketId: socket.id });

      if (room.size === 0) {
        rooms.delete(roomId);
      }
    });
  });
}

module.exports = { createMeetingSocket };
