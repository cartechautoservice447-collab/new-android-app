package com.liquidglass.studio.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.liquidglass.studio.ui.theme.AccentAmber
import com.liquidglass.studio.ui.theme.AccentCyan
import com.liquidglass.studio.ui.theme.AccentEmerald
import com.liquidglass.studio.ui.theme.AccentRose
import com.liquidglass.studio.ui.theme.AccentSky
import com.liquidglass.studio.ui.theme.AccentViolet

fun getCourseAccentColor(name: String): Color {
    return when (name.lowercase()) {
        "sky" -> AccentSky
        "violet" -> AccentViolet
        "amber" -> AccentAmber
        "emerald" -> AccentEmerald
        "rose" -> AccentRose
        "cyan" -> AccentCyan
        else -> AccentSky
    }
}

@Composable
fun LiquidBackground(
    modifier: Modifier = Modifier,
    darkTheme: Boolean = true,
    content: @Composable BoxScope.() -> Unit
) {
    val bgBrush = if (darkTheme) {
        Brush.radialGradient(
            colors = listOf(
                Color(0xFF143254),
                Color(0xFF0F1E36),
                Color(0xFF07111F)
            ),
            radius = 1600f
        )
    } else {
        Brush.radialGradient(
            colors = listOf(
                Color(0xFFDCEBFA),
                Color(0xFFE9F1FC),
                Color(0xFFEEF4FB)
            ),
            radius = 1600f
        )
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(bgBrush)
    ) {
        content()
    }
}

@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    shape: Shape = RoundedCornerShape(24.dp),
    borderColor: Color = Color(0x33FFFFFF),
    borderWidth: Dp = 1.dp,
    accentGlow: Color? = null,
    onClick: (() -> Unit)? = null,
    content: @Composable BoxScope.() -> Unit
) {
    val surfaceBrush = Brush.linearGradient(
        colors = listOf(
            accentGlow?.copy(alpha = 0.18f) ?: Color(0x28FFFFFF),
            Color(0x0EFFFFFF)
        )
    )

    val clickableModifier = if (onClick != null) {
        modifier.clickable(onClick = onClick)
    } else {
        modifier
    }

    Box(
        modifier = clickableModifier
            .clip(shape)
            .background(surfaceBrush)
            .border(borderWidth, borderColor, shape)
    ) {
        content()
    }
}

@Composable
fun GlassInner(
    modifier: Modifier = Modifier,
    shape: Shape = RoundedCornerShape(16.dp),
    content: @Composable BoxScope.() -> Unit
) {
    Box(
        modifier = modifier
            .clip(shape)
            .background(Color(0x14FFFFFF))
            .border(1.dp, Color(0x1AFFFFFF), shape)
    ) {
        content()
    }
}
