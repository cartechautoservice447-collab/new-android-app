package com.liquidglass.studio.ui.screens

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.SelfImprovement
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.liquidglass.studio.ui.components.GlassCard
import com.liquidglass.studio.ui.components.GlassInner
import com.liquidglass.studio.ui.theme.AccentAmber
import com.liquidglass.studio.ui.theme.AccentEmerald
import com.liquidglass.studio.ui.theme.AccentSky
import com.liquidglass.studio.ui.theme.AccentViolet
import com.liquidglass.studio.ui.theme.TextMuted
import com.liquidglass.studio.ui.theme.TextPrimary
import com.liquidglass.studio.ui.theme.TextSecondary
import kotlinx.coroutines.delay

enum class PomodoroMode(val label: String, val minutes: Int, val color: Color) {
    FOCUS("Focus", 25, AccentSky),
    SHORT_BREAK("Short Break", 5, AccentEmerald),
    LONG_BREAK("Long Break", 15, AccentViolet)
}

enum class StudyPlan(val label: String, val focusMinutes: Int, val restMinutes: Int, val color: Color) {
    DEEP("Deep Study", 50, 10, AccentSky),
    BALANCED("Balanced", 20, 10, AccentViolet),
    CLASSIC("Classic", 25, 5, AccentEmerald)
}

@Composable
fun StudySessionScreen(
    courseName: String = "CS50 Lectures",
    onBack: () -> Unit
) {
    var selectedPlan by remember { mutableStateOf(StudyPlan.CLASSIC) }
    var currentMode by remember { mutableStateOf(PomodoroMode.FOCUS) }
    var totalSeconds by remember(currentMode) { mutableIntStateOf(currentMode.minutes * 60) }
    var remainingSeconds by remember(currentMode) { mutableIntStateOf(currentMode.minutes * 60) }
    var isRunning by remember { mutableStateOf(false) }
    var completedSessions by remember { mutableIntStateOf(3) }
    var streakDays by remember { mutableIntStateOf(4) }

    LaunchedEffect(isRunning, remainingSeconds) {
        if (isRunning && remainingSeconds > 0) {
            delay(1000L)
            remainingSeconds -= 1
            if (remainingSeconds <= 0) {
                isRunning = false
                if (currentMode == PomodoroMode.FOCUS) {
                    completedSessions += 1
                }
            }
        }
    }

    val progress = remember(remainingSeconds, totalSeconds) {
        if (totalSeconds > 0) remainingSeconds.toFloat() / totalSeconds else 0f
    }
    val animatedProgress by animateFloatAsState(targetValue = progress, label = "timerProgress")

    val minutes = remainingSeconds / 60
    val seconds = remainingSeconds % 60
    val timeFormatted = String.format("%02d:%02d", minutes, seconds)

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        contentPadding = PaddingValues(top = 48.dp, bottom = 96.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Topbar
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(
                    onClick = onBack,
                    modifier = Modifier.testTag("study_back_button")
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Back",
                        tint = TextPrimary
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
                Column {
                    Text(
                        text = "STUDY HUB",
                        style = MaterialTheme.typography.labelSmall,
                        color = currentMode.color
                    )
                    Text(
                        text = "Focus Session",
                        style = MaterialTheme.typography.headlineMedium,
                        color = TextPrimary
                    )
                }
            }
        }

        // Mode Switcher (Focus, Short Break, Long Break)
        item {
            GlassInner(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(6.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    PomodoroMode.entries.forEach { mode ->
                        val isSelected = currentMode == mode
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(12.dp))
                                .background(if (isSelected) mode.color else Color.Transparent)
                                .clickable {
                                    currentMode = mode
                                    totalSeconds = mode.minutes * 60
                                    remainingSeconds = mode.minutes * 60
                                    isRunning = false
                                }
                                .padding(vertical = 10.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = mode.label,
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                color = if (isSelected) Color(0xFF07111F) else TextSecondary
                            )
                        }
                    }
                }
            }
        }

        // Timer Ring Card
        item {
            GlassCard(
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("pomodoro_ring_card"),
                accentGlow = currentMode.color
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier.size(240.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(
                            progress = { 1f },
                            modifier = Modifier.fillMaxSize(),
                            color = Color(0x22FFFFFF),
                            strokeWidth = 12.dp
                        )
                        CircularProgressIndicator(
                            progress = { animatedProgress },
                            modifier = Modifier.fillMaxSize(),
                            color = currentMode.color,
                            strokeWidth = 12.dp
                        )
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = timeFormatted,
                                fontSize = 48.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = if (isRunning) "SESSION IN PROGRESS" else "READY TO FOCUS",
                                style = MaterialTheme.typography.labelSmall,
                                color = currentMode.color
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(32.dp))

                    // Timer Controls
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(20.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Reset
                        IconButton(
                            onClick = {
                                isRunning = false
                                remainingSeconds = totalSeconds
                            },
                            modifier = Modifier
                                .size(48.dp)
                                .clip(CircleShape)
                                .background(Color(0x1FFFFFFF))
                                .testTag("timer_reset_button")
                        ) {
                            Icon(
                                imageVector = Icons.Default.Refresh,
                                contentDescription = "Reset Timer",
                                tint = TextPrimary
                            )
                        }

                        // Play/Pause
                        IconButton(
                            onClick = { isRunning = !isRunning },
                            modifier = Modifier
                                .size(68.dp)
                                .clip(CircleShape)
                                .background(currentMode.color)
                                .testTag("timer_toggle_button")
                        ) {
                            Icon(
                                imageVector = if (isRunning) Icons.Default.Pause else Icons.Default.PlayArrow,
                                contentDescription = if (isRunning) "Pause" else "Start",
                                tint = Color(0xFF07111F),
                                modifier = Modifier.size(36.dp)
                            )
                        }

                        // Complete / Skip
                        IconButton(
                            onClick = {
                                isRunning = false
                                remainingSeconds = 0
                                if (currentMode == PomodoroMode.FOCUS) completedSessions += 1
                            },
                            modifier = Modifier
                                .size(48.dp)
                                .clip(CircleShape)
                                .background(Color(0x1FFFFFFF))
                                .testTag("timer_complete_button")
                        ) {
                            Icon(
                                imageVector = Icons.Default.SelfImprovement,
                                contentDescription = "Complete Session",
                                tint = currentMode.color
                            )
                        }
                    }
                }
            }
        }

        // Stats Section
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                GlassInner(modifier = Modifier.weight(1f)) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.LocalFireDepartment,
                                contentDescription = null,
                                tint = AccentAmber,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "$streakDays Days",
                                style = MaterialTheme.typography.titleMedium,
                                color = TextPrimary,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Text(
                            text = "Daily Streak",
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextSecondary,
                            fontSize = 12.sp
                        )
                    }
                }

                GlassInner(modifier = Modifier.weight(1f)) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "$completedSessions",
                            style = MaterialTheme.typography.titleMedium,
                            color = AccentSky,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Completed Sets",
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextSecondary,
                            fontSize = 12.sp
                        )
                    }
                }
            }
        }

        // Study Plans Selector
        item {
            Text(
                text = "Study Rhythms",
                style = MaterialTheme.typography.titleLarge,
                color = TextPrimary,
                modifier = Modifier.padding(top = 8.dp)
            )
        }

        StudyPlan.entries.forEach { plan ->
            item {
                val isPlanSelected = selectedPlan == plan
                GlassCard(
                    modifier = Modifier.fillMaxWidth(),
                    accentGlow = if (isPlanSelected) plan.color else null,
                    onClick = {
                        selectedPlan = plan
                        totalSeconds = plan.focusMinutes * 60
                        remainingSeconds = totalSeconds
                        isRunning = false
                    }
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(12.dp)
                                .clip(CircleShape)
                                .background(plan.color)
                        )
                        Spacer(modifier = Modifier.width(14.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = plan.label,
                                style = MaterialTheme.typography.titleMedium,
                                color = TextPrimary,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "${plan.focusMinutes}m focus · ${plan.restMinutes}m recovery",
                                style = MaterialTheme.typography.bodyMedium,
                                color = TextSecondary,
                                fontSize = 12.sp
                            )
                        }
                        if (isPlanSelected) {
                            Text(
                                text = "Active",
                                style = MaterialTheme.typography.labelSmall,
                                color = plan.color
                            )
                        }
                    }
                }
            }
        }
    }
}
