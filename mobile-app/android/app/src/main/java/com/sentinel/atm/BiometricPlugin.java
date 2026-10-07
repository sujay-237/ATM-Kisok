package com.sentinel.atm;

import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.concurrent.Executor;

@CapacitorPlugin(name = "BiometricAuth")
public class BiometricPlugin extends Plugin {

    @PluginMethod
    public void checkBiometry(PluginCall call) {
        try {
            BiometricManager biometricManager = BiometricManager.from(getContext());
            int canAuth = biometricManager.canAuthenticate(
                    BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.BIOMETRIC_WEAK
            );
            boolean available = (canAuth == BiometricManager.BIOMETRIC_SUCCESS);
            JSObject ret = new JSObject();
            ret.put("isAvailable", available);
            ret.put("status", canAuth);
            call.resolve(ret);
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("isAvailable", false);
            ret.put("error", e.getMessage());
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void authenticate(PluginCall call) {
        String title = call.getString("title", "Fingerprint Verification");
        String subtitle = call.getString("subtitle", "Touch the fingerprint sensor to authorize ATM session");
        String cancelText = call.getString("cancelButtonText", "Use Passcode");

        getActivity().runOnUiThread(() -> {
            try {
                Executor executor = ContextCompat.getMainExecutor(getContext());

                BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
                        .setTitle(title)
                        .setSubtitle(subtitle)
                        .setNegativeButtonText(cancelText)
                        .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.BIOMETRIC_WEAK)
                        .build();

                BiometricPrompt biometricPrompt = new BiometricPrompt(
                        getActivity(),
                        executor,
                        new BiometricPrompt.AuthenticationCallback() {
                            @Override
                            public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                                super.onAuthenticationError(errorCode, errString);
                                JSObject res = new JSObject();
                                res.put("success", false);
                                res.put("error", errString.toString());
                                res.put("code", errorCode);
                                call.resolve(res);
                            }

                            @Override
                            public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                                super.onAuthenticationSucceeded(result);
                                JSObject res = new JSObject();
                                res.put("success", true);
                                call.resolve(res);
                            }

                            @Override
                            public void onAuthenticationFailed() {
                                super.onAuthenticationFailed();
                            }
                        }
                );

                biometricPrompt.authenticate(promptInfo);
            } catch (Exception e) {
                JSObject res = new JSObject();
                res.put("success", false);
                res.put("error", e.getMessage());
                call.resolve(res);
            }
        });
    }
}
