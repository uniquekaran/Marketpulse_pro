package com.marketpulse.pro;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.graphics.Color;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

public class MainActivity extends Activity {
    private static final String DASHBOARD_URL = BuildConfig.DASHBOARD_URL;
    private static final int BRAND_BG = Color.rgb(14, 17, 22);
    private static final int SURFACE = Color.rgb(21, 26, 34);
    private static final int TEXT = Color.rgb(246, 247, 251);
    private static final int MUTED = Color.rgb(152, 162, 179);
    private static final int PRIMARY = Color.rgb(25, 195, 125);

    private WebView webView;
    private View loadingOverlay;
    private View errorOverlay;
    private TextView errorText;
    private float pullStartY = -1f;
    private boolean pageLoaded = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        configureSystemBars();
        CookieManager.getInstance().setAcceptCookie(true);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(BRAND_BG);

        webView = new WebView(this);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);
        configureWebView();
        root.addView(webView, new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ));

        loadingOverlay = buildLoadingOverlay();
        errorOverlay = buildErrorOverlay();
        root.addView(loadingOverlay);
        root.addView(errorOverlay);
        errorOverlay.setVisibility(View.GONE);

        setContentView(root);

        if (savedInstanceState == null) {
            showLoading();
            webView.loadUrl(DASHBOARD_URL);
        } else {
            webView.restoreState(savedInstanceState);
            hideLoading();
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    @Override
    public void onBackPressed() {
        if (errorOverlay.getVisibility() == View.VISIBLE) {
            hideError();
            webView.reload();
            return;
        }
        if (webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        CookieManager.getInstance().flush();
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }

    private void configureSystemBars() {
        Window window = getWindow();
        window.setStatusBarColor(BRAND_BG);
        window.setNavigationBarColor(BRAND_BG);
        window.getDecorView().setSystemUiVisibility(0);
    }

    @SuppressLint({"SetJavaScriptEnabled", "ClickableViewAccessibility"})
    private void configureWebView() {
        webView.setBackgroundColor(BRAND_BG);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setTextZoom(100);
        settings.setUserAgentString(settings.getUserAgentString() + " MarketPulseAndroidWebView/1.0");

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                showLoading();
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme();
                if ("http".equals(scheme) || "https".equals(scheme)) return false;
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                pageLoaded = true;
                CookieManager.getInstance().flush();
                hideLoading();
                hideError();
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    showError(isOnline() ? "Dashboard failed to load. Start the backend server and retry." : "No internet connection. Check network and retry.");
                }
            }

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request, android.webkit.WebResourceResponse errorResponse) {
                if (request.isForMainFrame()) {
                    showError("Server returned an error. Check the dashboard backend and retry.");
                }
            }
        });

        webView.setOnTouchListener((view, event) -> {
            if (event.getAction() == android.view.MotionEvent.ACTION_DOWN) {
                pullStartY = event.getY();
            } else if (event.getAction() == android.view.MotionEvent.ACTION_UP && pullStartY >= 0) {
                float delta = event.getY() - pullStartY;
                if (webView.getScrollY() == 0 && delta > 180) {
                    showLoading();
                    webView.reload();
                }
                pullStartY = -1f;
            }
            return false;
        });
    }

    private View buildLoadingOverlay() {
        FrameLayout overlay = new FrameLayout(this);
        overlay.setBackgroundColor(BRAND_BG);
        overlay.setClickable(true);

        TextView title = new TextView(this);
        title.setText("MarketPulse Pro");
        title.setTextColor(TEXT);
        title.setTextSize(24);
        title.setGravity(Gravity.CENTER);

        ProgressBar progress = new ProgressBar(this);
        progress.getIndeterminateDrawable().setTint(PRIMARY);

        TextView subtitle = new TextView(this);
        subtitle.setText(getString(R.string.loading_dashboard));
        subtitle.setTextColor(MUTED);
        subtitle.setTextSize(14);
        subtitle.setGravity(Gravity.CENTER);

        FrameLayout column = new FrameLayout(this);
        column.setBackgroundColor(SURFACE);
        column.setPadding(dp(24), dp(24), dp(24), dp(24));

        FrameLayout.LayoutParams titleParams = centeredParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(40), 0, -54);
        FrameLayout.LayoutParams progressParams = centeredParams(dp(44), dp(44), 0, 0);
        FrameLayout.LayoutParams subtitleParams = centeredParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(36), 0, 58);
        column.addView(title, titleParams);
        column.addView(progress, progressParams);
        column.addView(subtitle, subtitleParams);

        FrameLayout.LayoutParams columnParams = centeredParams(dp(280), dp(190), 0, 0);
        overlay.addView(column, columnParams);
        return overlay;
    }

    private View buildErrorOverlay() {
        FrameLayout overlay = new FrameLayout(this);
        overlay.setBackgroundColor(BRAND_BG);
        overlay.setClickable(true);

        FrameLayout card = new FrameLayout(this);
        card.setBackgroundColor(SURFACE);
        card.setPadding(dp(22), dp(22), dp(22), dp(22));

        TextView title = new TextView(this);
        title.setText("Unable to load");
        title.setTextColor(TEXT);
        title.setTextSize(22);
        title.setGravity(Gravity.CENTER);

        errorText = new TextView(this);
        errorText.setText(getString(R.string.internet_error));
        errorText.setTextColor(MUTED);
        errorText.setTextSize(14);
        errorText.setGravity(Gravity.CENTER);

        Button retry = new Button(this);
        retry.setText("Retry");
        retry.setTextColor(Color.rgb(6, 17, 12));
        retry.setBackgroundColor(PRIMARY);
        retry.setOnClickListener(v -> {
            showLoading();
            hideError();
            webView.loadUrl(DASHBOARD_URL);
        });

        card.addView(title, centeredParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(36), 0, -58));
        card.addView(errorText, centeredParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(70), 0, 0));
        card.addView(retry, centeredParams(dp(150), dp(46), 0, 68));
        overlay.addView(card, centeredParams(dp(310), dp(230), 0, 0));
        return overlay;
    }

    private FrameLayout.LayoutParams centeredParams(int width, int height, int leftOffset, int topOffset) {
        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(width, height);
        params.gravity = Gravity.CENTER;
        params.leftMargin = leftOffset;
        params.topMargin = topOffset;
        return params;
    }

    private void showLoading() {
        loadingOverlay.setVisibility(View.VISIBLE);
    }

    private void hideLoading() {
        loadingOverlay.setVisibility(View.GONE);
    }

    private void showError(String message) {
        pageLoaded = false;
        hideLoading();
        errorText.setText(message);
        errorOverlay.setVisibility(View.VISIBLE);
    }

    private void hideError() {
        errorOverlay.setVisibility(View.GONE);
    }

    private boolean isOnline() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        if (cm == null) return false;
        Network network = cm.getActiveNetwork();
        if (network == null) return false;
        NetworkCapabilities capabilities = cm.getNetworkCapabilities(network);
        return capabilities != null && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
