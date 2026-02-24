import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { FiArrowLeft, FiMic, FiMicOff, FiVideo, FiVideoOff, FiPhoneOff, FiVolumeX } from 'react-icons/fi';
import '../styles/Consultation.css';
import { API_BASE_URL } from '../config/api';

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
  const [cameraControlledByAdmin, setCameraControlledByAdmin] = useState(false);

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
  const offerRetryTimersRef = useRef({});
  const endRedirectTimerRef = useRef(null);
  const remoteParticipant = participants[0] || null;

  useEffect(() => {
    let mounted = true;

    const fetchAppointment = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/appointments/${appointmentId}`, {
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
  },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [appointmentId]);

  const startMeeting = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      stream.getVideoTracks().forEach((track) => {
        track.enabled = false;
      });
      stream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });

      localStreamRef.current = stream;
      await attachLocalStream(stream);
      setCameraEnabled(false);
      setMicEnabled(stream.getAudioTracks().some((track) => track.enabled));

      const socket = io(`${API_BASE_URL}`, {
        auth: { token }
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('join-room', {
          roomId,
          userName
        });
        socket.emit('participant-state', {
          micEnabled: true,
          cameraEnabled: false
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

      socket.on('connect_error', (connectError) => {
        setError(connectError?.message || 'Meeting connection failed');
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

      socket.on('force-camera-by-admin', ({ enabled }) => {
        setCameraControlledByAdmin(true);
        toggleCamera(Boolean(enabled), true);
      });

      socket.on('meeting-ended', ({ endedBy }) => {
        setMeetingEnded(true);
        setError(`Meeting ended by ${endedBy}.`);
        if (isAdmin) {
          endRedirectTimerRef.current = setTimeout(() => {
            navigate('/admin/doctor-notes');
          }, 400);
        } else {
          endRedirectTimerRef.current = setTimeout(() => {
            navigate('/dashboard');
          }, 1200);
        }
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
      sendOffer(targetSocketId, pc);
    } else {
      // Fallback: if initial signaling is missed, send an offer after a short delay.
      offerRetryTimersRef.current[targetSocketId] = setTimeout(() => {
        const currentPc = peerConnectionsRef.current[targetSocketId];
        if (!currentPc) return;
        if (currentPc.currentRemoteDescription) return;
        sendOffer(targetSocketId, currentPc);
      }, 1200);
    }

    return pc;
  };

  const sendOffer = (targetSocketId, pc) => {
    const socket = socketRef.current;
    if (!socket || !pc) return;

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
  };

  const closePeerConnection = (socketId) => {
    if (offerRetryTimersRef.current[socketId]) {
      clearTimeout(offerRetryTimersRef.current[socketId]);
      delete offerRetryTimersRef.current[socketId];
    }
    const pc = peerConnectionsRef.current[socketId];
    if (pc) {
      pc.close();
      delete peerConnectionsRef.current[socketId];
    }
  };

  const cleanupMeeting = () => {
    if (endRedirectTimerRef.current) {
      clearTimeout(endRedirectTimerRef.current);
      endRedirectTimerRef.current = null;
    }

    Object.keys(offerRetryTimersRef.current).forEach((socketId) => {
      clearTimeout(offerRetryTimersRef.current[socketId]);
      delete offerRetryTimersRef.current[socketId];
    });

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

  const emitParticipantState = (nextMicEnabled, nextCameraEnabled) => {
    if (!socketRef.current) return;
    socketRef.current.emit('participant-state', {
      micEnabled: nextMicEnabled,
      cameraEnabled: nextCameraEnabled
    });
  };

  const attachLocalStream = async (stream) => {
    if (!localVideoRef.current) return;
    localVideoRef.current.srcObject = stream;
    try {
      await localVideoRef.current.play();
    } catch (playErr) {
      // Browsers can block autoplay until user gesture; keep stream attached.
    }
  };

  const replaceVideoTrackForPeers = (track) => {
    Object.values(peerConnectionsRef.current).forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
      if (sender) {
        sender.replaceTrack(track).catch(() => {});
      } else if (localStreamRef.current && track) {
        pc.addTrack(track, localStreamRef.current);
      }
    });
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

    emitParticipantState(nextState, cameraEnabled);
  };

  const toggleCamera = async (forcedState = null, forcedByAdmin = false) => {
    const nextState = typeof forcedState === 'boolean' ? forcedState : !cameraEnabled;

    if (!localStreamRef.current) {
      localStreamRef.current = new MediaStream();
    }

    const existingVideoTrack = localStreamRef.current.getVideoTracks()[0];

    if (nextState) {
      if (existingVideoTrack && existingVideoTrack.readyState === 'live') {
        existingVideoTrack.enabled = true;
      } else {
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: false
          });
          const freshTrack = videoStream.getVideoTracks()[0];
          if (freshTrack) {
            if (existingVideoTrack) {
              localStreamRef.current.removeTrack(existingVideoTrack);
              existingVideoTrack.stop();
            }
            localStreamRef.current.addTrack(freshTrack);
            replaceVideoTrackForPeers(freshTrack);
          }
        } catch (cameraError) {
          setError('Unable to access camera. Please allow camera permission and try again.');
          return;
        }
      }
      setError('');
    } else if (existingVideoTrack) {
      existingVideoTrack.enabled = false;
    }

    setCameraEnabled(nextState);
    if (!forcedByAdmin) {
      setCameraControlledByAdmin(false);
    }
    await attachLocalStream(localStreamRef.current);
    emitParticipantState(micEnabled, nextState);
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

  const togglePatientCamera = () => {
    if (!isAdmin || !socketRef.current) return;
    const patient = participants.find((p) => p.role === 'patient');
    if (!patient) return;

    socketRef.current.emit('admin-camera-patient', {
      targetSocketId: patient.socketId,
      enabled: !Boolean(patient.cameraEnabled)
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
      {cameraControlledByAdmin && (
        <div className="room-alert">Your camera was changed by admin.</div>
      )}
      {error && appointment && !meetingEnded && (
        <div className="room-alert room-alert-danger">{error}</div>
      )}

      <div className="video-grid">
        <div className="video-card local">
          <div className="video-label">You ({isAdmin ? 'Admin' : 'Patient'})</div>
          <div className="video-status">
            {!micEnabled && (
              <span className="video-status-pill">
                <FiMicOff /> Muted
              </span>
            )}
            {!cameraEnabled && (
              <span className="video-status-pill">
                <FiVideoOff /> Camera Off
              </span>
            )}
          </div>
          <video ref={localVideoRef} autoPlay muted playsInline className="video-element" />
        </div>

        <div className="video-card remote">
          <div className="video-label">Remote Participant</div>
          <div className="video-status">
            {remoteParticipant && remoteParticipant.micEnabled === false && (
              <span className="video-status-pill">
                <FiMicOff /> Muted
              </span>
            )}
            {remoteParticipant && remoteParticipant.cameraEnabled === false && (
              <span className="video-status-pill">
                <FiVideoOff /> Camera Off
              </span>
            )}
          </div>
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
          <button type="button" className="control-btn warn" onClick={togglePatientCamera}>
            {remoteParticipant?.cameraEnabled === false ? <FiVideo /> : <FiVideoOff />}
            {remoteParticipant?.cameraEnabled === false ? ' Camera On Patient' : ' Camera Off Patient'}
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
