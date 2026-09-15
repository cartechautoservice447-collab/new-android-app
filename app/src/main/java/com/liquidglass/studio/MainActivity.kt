package com.liquidglass.studio

import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            webViewClient = WebViewClient()
            loadUrl("https://ais-dev-4yp5a6brmrg7qo4zuk6g5s-943212104213.asia-southeast1.run.app")
        }

        setContentView(webView)
    }
}
