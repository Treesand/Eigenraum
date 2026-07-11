package de.eigenraum.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeOpenAIPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
