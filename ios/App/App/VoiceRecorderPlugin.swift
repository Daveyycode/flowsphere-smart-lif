import Foundation
import Capacitor
import AVFoundation

@objc(VoiceRecorderPlugin)
public class VoiceRecorderPlugin: CAPPlugin {
    private var audioRecorder: AVAudioRecorder?
    private var audioFilePath: URL?

    @objc func startRecording(_ call: CAPPluginCall) {
        // Request microphone permission
        AVAudioSession.sharedInstance().requestRecordPermission { [weak self] granted in
            guard granted else {
                call.reject("Microphone permission denied")
                return
            }

            DispatchQueue.main.async {
                self?.startAudioRecording(call)
            }
        }
    }

    private func startAudioRecording(_ call: CAPPluginCall) {
        do {
            // Configure audio session
            let audioSession = AVAudioSession.sharedInstance()
            try audioSession.setCategory(.record, mode: .default)
            try audioSession.setActive(true)

            // Create file path for recording
            let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            let timestamp = Int(Date().timeIntervalSince1970)
            audioFilePath = documentsPath.appendingPathComponent("recording_\(timestamp).m4a")

            // Configure recording settings
            let settings: [String: Any] = [
                AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
                AVSampleRateKey: 44100.0,
                AVNumberOfChannelsKey: 1,
                AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
            ]

            // Create and start recorder
            guard let filePath = audioFilePath else {
                call.reject("Failed to create file path")
                return
            }

            audioRecorder = try AVAudioRecorder(url: filePath, settings: settings)
            audioRecorder?.prepareToRecord()
            audioRecorder?.record()

            call.resolve([
                "status": "recording",
                "message": "Recording started successfully"
            ])

        } catch {
            call.reject("Failed to start recording: \(error.localizedDescription)")
        }
    }

    @objc func stopRecording(_ call: CAPPluginCall) {
        guard let recorder = audioRecorder, recorder.isRecording else {
            call.reject("No active recording")
            return
        }

        recorder.stop()

        do {
            try AVAudioSession.sharedInstance().setActive(false)
        } catch {
            print("Failed to deactivate audio session: \(error)")
        }

        guard let filePath = audioFilePath else {
            call.reject("No recording file found")
            return
        }

        // Read file as base64
        do {
            let audioData = try Data(contentsOf: filePath)
            let base64String = audioData.base64EncodedString()

            call.resolve([
                "status": "stopped",
                "audioData": base64String,
                "mimeType": "audio/m4a",
                "duration": recorder.currentTime
            ])

            // Clean up
            audioRecorder = nil
            try? FileManager.default.removeItem(at: filePath)
            audioFilePath = nil

        } catch {
            call.reject("Failed to read audio file: \(error.localizedDescription)")
        }
    }

    @objc func isRecording(_ call: CAPPluginCall) {
        let recording = audioRecorder?.isRecording ?? false
        call.resolve([
            "isRecording": recording
        ])
    }

    @objc func hasPermission(_ call: CAPPluginCall) {
        let status = AVAudioSession.sharedInstance().recordPermission

        call.resolve([
            "hasPermission": status == .granted
        ])
    }

    @objc func requestPermission(_ call: CAPPluginCall) {
        AVAudioSession.sharedInstance().requestRecordPermission { granted in
            call.resolve([
                "granted": granted
            ])
        }
    }
}
