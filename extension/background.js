var recorder

function createSocket() {
	return new Promise((r, a) => {
		chrome.sockets.tcp.create(({ socketId }) => {
			chrome.sockets.tcp.connect(socketId, 'localhost', 9001, (code) => {
				if (code) a(code)

				r(socketId)
			})
		})
	})
}

function capture({ width, height }) {
	return new Promise((r, a) => {
		chrome.tabCapture.capture({
			audio: true, video: true,
			videoConstraints: {
				mandatory: {
					minWidth: width,
					minHeight: height,
					maxWidth: width,
					maxHeight: height,
					maxFrameRate: 30,
					minFrameRate: 30,
				}
			}
		}, r)
	})
}

async function START_RECORDING(opt) {
	var stream = await capture(opt)
	if (!stream) return false;
	var socketId = await createSocket()
	if (!socketId) return false;

	recorder = new MediaRecorder(stream, {
		mimeType: 'video/webm;codecs=vp9,opus'
	});
	// TODO: recorder onerror

	recorder.ondataavailable = async function (event) {
		if (event.data.size > 0) {
			recorder.timecode = event.timecode
			chrome.sockets.tcp.send(socketId, await event.data.arrayBuffer(), (a) => {
				if (a.resultCode) {
					console.log(`socket send error`, a)
				}
			})
		}
	};

	recorder.onerror = (e) => {
		recorder.stop();
		console.log(`recorder onerror:`, e)
	}

	recorder.onstop = function () {
		try {
			const tracks = stream.getTracks();
			tracks.forEach(function (track) {
				track.stop();
			});

			chrome.sockets.tcp.disconnect(socketId, () => {
				chrome.sockets.tcp.close(socketId, () => { })
			})
		} catch (error) { console.log(`recorder onstop`, error) }

		let duration = parseInt(recorder.timecode) - recorder.startTime
		console.log(`record stoped duration: ${duration} ${recorder.timecode} ${recorder.startTime}`)
	};
	// stream.oninactive = () => {
	// 	try {
	// 		recorder.stop();
	// 	} catch (error) { console.log(`eeeeeeeeee1`, error) }
	// };

	recorder.startTime = Date.now()
	recorder.start(1000);
	return true;
}

function STOP_RECORDING() {
	if (!recorder) return;
	recorder.stop();
}