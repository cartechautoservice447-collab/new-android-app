package com.liquidglass.studio;

import android.os.Bundle;

import androidx.core.view.WindowCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Let the native shell use the same full-height canvas as the mobile-first web UI.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    }
}
