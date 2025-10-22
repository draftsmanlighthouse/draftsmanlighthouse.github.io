import Alpine from "alpinejs";
import {
  ConsoleLogger,
  DefaultDeviceController,
  DefaultMeetingSession,
  LogLevel,
  MeetingSessionConfiguration,
} from "amazon-chime-sdk-js";

window.Alpine = Alpine;

window.chimeApp = function () {
  return {
    userName: "",
    joinMeetingId: "",
    meetingId: "",
    inMeeting: false,
    loading: false,
    videoEnabled: true,
    audioEnabled: true,
    status: { message: "", type: "" },
    meetingSession: null,

    async createMeeting() {
      this.loading = true;
      this.showStatus("Meeting wordt aangemaakt...", "success");
      try {
        const res = await fetch("/api/create-meeting", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: this.userName }),
        });
        const data = await res.json();
        if (data.success) {
          this.meetingId = data.meeting.MeetingId;
          await this.startChimeSession(data.meeting, data.attendee);
          this.showStatus("Meeting succesvol gestart!", "success");
        } else throw new Error(data.error);
      } catch (err) {
        this.showStatus("Fout: " + err.message, "error");
      } finally {
        this.loading = false;
      }
    },

    async joinMeeting() {
      this.loading = true;
      try {
        const res = await fetch("/api/join-meeting", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            meetingId: this.joinMeetingId,
            name: this.userName,
          }),
        });
        const data = await res.json();
        if (data.success) {
          this.meetingId = this.joinMeetingId;
          await this.startChimeSession(
            { MeetingId: this.joinMeetingId },
            data.attendee
          );
          this.showStatus("Succesvol deelgenomen!", "success");
        } else throw new Error(data.error);
      } catch (err) {
        this.showStatus("Fout: " + err.message, "error");
      } finally {
        this.loading = false;
      }
    },

    async startChimeSession(meeting, attendee) {
      const logger = new ConsoleLogger("ChimeLogger", LogLevel.INFO);
      const deviceController = new DefaultDeviceController(logger);
      const config = new MeetingSessionConfiguration(meeting, attendee);
      this.meetingSession = new DefaultMeetingSession(
        config,
        logger,
        deviceController
      );

      const observer = {
        videoTileDidUpdate: (tileState) => {
          if (!tileState.localTile) {
            this.meetingSession.audioVideo.bindVideoElement(
              tileState.tileId,
              document.getElementById("remote-video")
            );
          }
        },
      };

      this.meetingSession.audioVideo.addObserver(observer);
      await this.meetingSession.audioVideo.start();

      const devices = await this.meetingSession.audioVideo.listVideoInputDevices();
      if (devices.length) {
        await this.meetingSession.audioVideo.startVideoInput(devices[0].deviceId);
        this.meetingSession.audioVideo.startLocalVideoTile();
        this.meetingSession.audioVideo.bindVideoElement(
          this.meetingSession.audioVideo.getLocalVideoTile().tileId,
          document.getElementById("local-video")
        );
      }
      this.inMeeting = true;
    },

    leaveMeeting() {
      if (this.meetingSession) this.meetingSession.audioVideo.stop();
      this.inMeeting = false;
      this.meetingId = "";
      this.showStatus("Je hebt de meeting verlaten", "success");
    },

    toggleVideo() {
      if (this.videoEnabled) this.meetingSession.audioVideo.stopLocalVideoTile();
      else this.meetingSession.audioVideo.startLocalVideoTile();
      this.videoEnabled = !this.videoEnabled;
    },

    toggleAudio() {
      if (this.audioEnabled)
        this.meetingSession.audioVideo.realtimeMuteLocalAudio();
      else this.meetingSession.audioVideo.realtimeUnmuteLocalAudio();
      this.audioEnabled = !this.audioEnabled;
    },

    showStatus(message, type) {
      this.status = { message, type };
      console.log(type, ": ", message)
      setTimeout(() => (this.status = { message: "", type: "" }), 4000);
    },
  };
};

Alpine.start();