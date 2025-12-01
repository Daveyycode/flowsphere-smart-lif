#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(VoiceRecorderPlugin, "VoiceRecorder",
    CAP_PLUGIN_METHOD(startRecording, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(stopRecording, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(isRecording, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(hasPermission, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(requestPermission, CAPPluginReturnPromise);
)
