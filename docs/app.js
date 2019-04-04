

window.onresize = evt => {
    const cWidth = window.innerWidth;
    const cHeight = window.innerHeight;
    const cRatio = cWidth / cHeight;
    const oWidth = 1920;
    const oHeight = 1017;
    const oRatio = oWidth / oHeight;
    let width, height, left, top;

    if (oRatio > cRatio) {
        width = cWidth;
        height = cWidth / oRatio;
    } else {
        width = cHeight * oRatio;
        height = cHeight;
    }
    left = (cWidth - width) / 2;
    top = (cHeight - height) / 2;
    right = width + left;

    placeHolder.style.left = `${(409 * width / oWidth) + left}px`;
    placeHolder.style.top = `${(154 * height / oHeight) + top}px`;
    placeHolder.style.width = `${1084 * width / oWidth}px`;
    placeHolder.style.height = `${723 * height / oHeight}px`;
    // l=408, r=154
    // w=1084, h=723
}
window.onresize();

class Peer {
    constructor(opt) {
        this.remoteVideos = {};
        this.opt = opt || {};
        this.rafId = null;
        const netConfig = new awrtc.NetworkConfig();
        netConfig.IsConference = this.opt.isConference || false;
        netConfig.IceServers = this.opt.iceServers || [
            { urls: 'stun:stun.l.google.com:19302' }
        ];
        netConfig.SignalingUrl = this.opt.SignalingUrl || 'wss://172.16.1.49:12777';

        const mediaConfig = new awrtc.MediaConfig();
        mediaConfig.Audio = this.opt.audio || false;
        mediaConfig.Video = this.opt.video || false;
        mediaConfig.IdealWidth = this.opt.streamingWidth || 1280;
        mediaConfig.IdealHeight = this.opt.streamingHeight || 720;
        mediaConfig.IdealFps = this.opt.streamingFPS || 15;
        mediaConfig.FrameUpdates = this.opt.streamingFrameUpdates || false;

        this.peer = new awrtc.BrowserWebRtcCall(netConfig);
        this.peer.Configure(mediaConfig);
        this.peer.addEventListener((sender, evt) => {
            if (evt.Type === awrtc.CallEventType.WaitForIncomingCall) {
                console.log('WaitForIncomingCall');
            } else if (evt.Type === awrtc.CallEventType.CallAccepted) {
                console.log('CallAccepted');
            } else if (evt.Type === awrtc.CallEventType.ConfigurationComplete) {
                console.log('configuration complete');
            } else if (evt.Type === awrtc.CallEventType.MediaUpdate) {
                if (evt.ConnectionId.id === awrtc.ConnectionId.INVALID.id) {
                    // local
                    document.body.appendChild(evt.VideoElement);
                } else if (evt.ConnectionId.id !== awrtc.ConnectionId.INVALID.id && !this.remoteVideos[evt.ConnectionId.id]) {
                    // remote
                    evt.VideoElement.muted = true;
                    evt.VideoElement.controls = false;
                    this.remoteVideos[evt.ConnectionId.id] = evt.VideoElement;
                    placeHolder.appendChild(evt.VideoElement);
                    evt.VideoElement.play();
                }
            } else if (evt.Type === awrtc.CallEventType.ListeningFailed) {
                if (!netConfig.IsConference) {
                    // Callモードの場合は、Listen()が失敗した場合(すでにサーバーが起動し存在している場合)は
                    // Call()を行う
                    this.peer.Call(this.mAddress);
                } else {
                    console.error('Listening failed. Server dead?');
                }
            } else if (evt.Type === awrtc.CallEventType.ConnectionFailed) {
                alert('connection failed');
            } else if (evt.Type === awrtc.CallEventType.CallEnded) {
                //call endet or was disconnected
                console.log(`call ended with id ${evt.ConnectionId.id}`);
                document.body.removeChild(this.remoteVideos[evt.ConnectionId.id]);
                delete this.remoteVideos[evt.ConnectionId.id];
            } else if (evt.Type === awrtc.CallEventType.Message) {
                this.peer.Send(evt.Content, evt.Reliable, evt.ConnectionId);
            } else if (evt.Type == awrtc.CallEventType.DataMessage) {
                this.peer.SendData(evt.Content, evt.Reliable, evt.ConnectionId);
            } else {
                console.log(`Unhandled event: ${evt.Type}`);
            }
        });
    }

    start() {
        this.peer.Listen(this.opt.roomId || 'NeutransBIZ');
        this.rafId = requestAnimationFrame(this.update.bind(this));
    }

    update() {
        this.rafId = requestAnimationFrame(this.update.bind(this));
        this.peer.Update();
    }

    stop() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }
        if (this.peer != null) {
            this.peer.Dispose();
            this.peer = null;
        }
    }
}

const peer = new Peer();
peer.start();
