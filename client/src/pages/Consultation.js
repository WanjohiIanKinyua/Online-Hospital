import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { FiArrowLeft, FiMic, FiMicOff, FiVideo, FiVideoOff, FiPhoneOff, FiVolumeX } from 'react-icons/fi';
import '../styles/Consultation.css';

const RTC_CONFIG = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

function Consultation() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();

  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [participants, setParticipants] = useState([]);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [meetingEnded, setMeetingEnded] = useState(false);
  const [mutedByAdmin, setMutedByAdmin] = useState(false);

  const socketRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const localStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole');
  const userName = localStorage.getItem('userName') || 'User';

  const roomId = `appointment-${appointmentId}`;
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    let mounted = true;

    const fetchAppointment = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/appointments/${appointmentId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!mounted) return;

        setAppointment(response.data);
        await startMeeting();
      } catch (err) {
        if (!mounted) return;
        setError(err.response?.data?.error || 'Failed to load appointment details');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAppointment();

    return () => {
      mounted = false;
      cleanupMeeting();
    };
  }, [appointmentId]);

  const startMeeting = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const socket = io('http://localhost:5000', {
        auth: { token }
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('join-room', {
          roomId,
          userName
        });
      });

      socket.on('room-participants', (existingParticipants) => {
        setParticipants(existingParticipants);
        existingParticipants.forEach((participant) => {
          createPeerConnection(participant.socketId, true);
        });
      });

      socket.on('participant-joined', (participant) => {
        setParticipants((prev) => {
          const next = prev.filter((p) => p.socketId !== participant.socketId);
          next.push(participant);
          return next;
        });
        createPeerConnection(participant.socketId, false);
      });

      socket.on('participant-left', ({ socketId }) => {
        setParticipants((prev) => prev.filter((p) => p.socketId !== socketId));
        closePeerConnection(socketId);
      });

      socket.on('participant-updated', (updatedParticipant) => {
        setParticipants((prev) => {
          const others = prev.filter((p) => p.socketId !== updatedParticipant.socketId);
          others.push(updatedParticipant);
          return others;
        });
      });

      socket.on('webrtc-offer', async ({ fromSocketId, offer }) => {
        const pc = createPeerConnection(fromSocketId, false);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('webrtc-answer', {
          targetSocketId: fromSocketId,
          answer
        });
      });

      socket.on('webrtc-answer', async ({ fromSocketId, answer }) => {
        const pc = peerConnectionsRef.current[fromSocketId];
        if (!pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      });

      socket.on('webrtc-ice-candidate', async ({ fromSocketId, candidate }) => {
        const pc = peerConnectionsRef.current[fromSocketId];
        if (!pc) return;
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (iceError) {
          console.error('ICE candidate error:', iceError);
        }
      });

      socket.on('force-muted-by-admin', () => {
        setMutedByAdmin(true);
        toggleMic(false, true);
      });

      socket.on('meeting-ended', ({ endedBy }) => {
        setMeetingEnded(true);
        setError(`Meeting ended by ${endedBy}.`);
      });
    } catch (mediaError) {
      setError('Could not access camera/microphone. Please allow permissions and reload.');
    }
  };

  const createPeerConnection = (targetSocketId, shouldCreateOffer) => {
    if (peerConnectionsRef.current[targetSocketId]) {
      return peerConnectionsRef.current[targetSocketId];
    }

    const socket = socketRef.current;
    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnectionsRef.current[targetSocketId] = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    };

    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      socket.emit('webrtc-ice-candidate', {
        targetSocketId,
        candidate: event.candidate
      });
    };

    if (shouldCreateOffer) {
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer).then(() => offer))
        .then((offer) => {
          socket.emit('webrtc-offer', {
            targetSocketId,
            offer
          });
        })
        .catch((offerErr) => {
          console.error('Offer error:', offerErr);
        });
    }

    return pc;
  };

  const closePeerConnection = (socketId) => {
    const pc = peerConnectionsRef.current[socketId];
    if (pc) {
      pc.close();
      delete peerConnectionsRef.current[socketId];
    }
  };

  const cleanupMeeting = () => {
    Object.keys(peerConnectionsRef.current).forEach((socketId) => {
      closePeerConnection(socketId);
    });

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
  };

  const toggleMic = (forcedState = null, forcedByAdmin = false) => {
    if (!localStreamRef.current) return;

    const nextState = typeof forcedState === 'boolean' ? forcedState : !micEnabled;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = nextState;
    });

    setMicEnabled(nextState);
    if (!forcedByAdmin) {
      setMutedByAdmin(false);
    }

    if (socketRef.current) {
      socketRef.current.emit('participant-state', {
        micEnabled: nextState,
        cameraEnabled
      });
    }
  };

  const toggleCamera = () => {
    if (!localStreamRef.current) return;

    const nextState = !cameraEnabled;
    localStreamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = nextState;
    });
    setCameraEnabled(nextState);

    if (socketRef.current) {
      socketRef.current.emit('participant-state', {
        micEnabled,
        cameraEnabled: nextState
      });
    }
  };

  const endMeetingAsAdmin = () => {
    if (!isAdmin || !socketRef.current) return;
    socketRef.current.emit('admin-end-meeting');
  };

  const mutePatient = () => {
    if (!isAdmin || !socketRef.current) return;
    const patient = participants.find((p) => p.role === 'patient');
    if (!patient) return;

    socketRef.current.emit('admin-mute-patient', {
      targetSocketId: patient.socketId
    });
  };

  if (loading) {
    return <div className="loading">Loading consultation room...</div>;
  }

  if (error && !appointment) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="consult-room-page">
      <div className="consult-room-header">
        <Link to={isAdmin ? '/admin/appointments' : '/dashboard'} className="back-button">
          <FiArrowLeft /> Back
        </Link>
        <div className="room-meta">
          <h2>Consultation Room</h2>
          {appointment && (
            <p>
              {appointment.doctorName} | {new Date(appointment.appointmentDate).toLocaleDateString()} {appointment.appointmentTime}
            </p>
          )}
        </div>
      </div>

      {meetingEnded && (
        <div className="room-alert room-alert-danger">Meeting has ended.</div>
      )}
      {mutedByAdmin && (
        <div className="room-alert">You were muted by admin.</div>
      )}
      {error && appointment && !meetingEnded && (
        <div className="room-alert room-alert-danger">{error}</div>
      )}

      <div className="video-grid">
        <div className="video-card local">
          <div className="video-label">You ({isAdmin ? 'Admin' : 'Patient'})</div>
          <video ref={localVideoRef} autoPlay muted playsInline className="video-element" />
        </div>

        <div className="video-card remote">
          <div className="video-label">Remote Participant</div>
          <video ref={remoteVideoRef} autoPlay playsInline className="video-element" />
          {participants.length === 0 && <div className="waiting-overlay">Waiting for other participant...</div>}
        </div>
      </div>

      <div className="meeting-controls">
        <button type="button" className={`control-btn ${micEnabled ? '' : 'off'}`} onClick={() => toggleMic()}>
          {micEnabled ? <FiMic /> : <FiMicOff />} {micEnabled ? 'Mute' : 'Unmute'}
        </button>

        <button type="button" className={`control-btn ${cameraEnabled ? '' : 'off'}`} onClick={toggleCamera}>
          {cameraEnabled ? <FiVideo /> : <FiVideoOff />} {cameraEnabled ? 'Camera Off' : 'Camera On'}
        </button>

        {isAdmin && (
          <button type="button" className="control-btn warn" onClick={mutePatient}>
            <FiVolumeX /> Mute Patient
          </button>
        )}

        {isAdmin && (
          <button type="button" className="control-btn danger" onClick={endMeetingAsAdmin}>
            <FiPhoneOff /> End Meeting
          </button>
        )}
      </div>
    </div>
  );
}

export default Consultation;
