package com.liquidglass.studio.ui.screens

import androidx.compose.foundation.background
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
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.liquidglass.studio.data.model.CollectionEntity
import com.liquidglass.studio.data.model.CourseEntity
import com.liquidglass.studio.data.model.NoteEntity
import com.liquidglass.studio.ui.components.GlassCard
import com.liquidglass.studio.ui.components.GlassInner
import com.liquidglass.studio.ui.components.getCourseAccentColor
import com.liquidglass.studio.ui.theme.TextMuted
import com.liquidglass.studio.ui.theme.TextPrimary
import com.liquidglass.studio.ui.theme.TextSecondary

data class CourseToolItem(
    val title: String,
    val description: String,
    val icon: ImageVector,
    val action: () -> Unit
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CourseWorkspaceScreen(
    course: CourseEntity,
    collections: List<CollectionEntity>,
    notes: List<NoteEntity>,
    onBack: () -> Unit,
    onOpenCollections: () -> Unit,
    onOpenAllNotes: () -> Unit,
    onOpenStudySession: () -> Unit,
    onUpdateProgress: (Int) -> Unit
) {
    val accent = getCourseAccentColor(course.color)
    val noteCount = notes.size
    val collectionCount = collections.size
    var sliderProgress by remember(course.progress) { mutableFloatStateOf(course.progress.toFloat()) }

    val tools = listOf(
        CourseToolItem(
            title = "Study Session",
            description = "Start a focused study session for this course.",
            icon = Icons.Default.PlayArrow,
            action = onOpenStudySession
        ),
        CourseToolItem(
            title = "Collections",
            description = "Organize notes into focused study groups.",
            icon = Icons.Default.Folder,
            action = onOpenCollections
        ),
        CourseToolItem(
            title = "All Notes",
            description = "Open every note stored in this course.",
            icon = Icons.Default.Description,
            action = onOpenAllNotes
        ),
        CourseToolItem(
            title = "Course Overview",
            description = "See this course progress, notes and activity.",
            icon = Icons.Default.Book,
            action = onOpenCollections
        )
    )

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        contentPadding = PaddingValues(top = 48.dp, bottom = 96.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Top bar
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(
                    onClick = onBack,
                    modifier = Modifier.testTag("course_back_button")
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
                        text = "COURSE WORKSPACE",
                        style = MaterialTheme.typography.labelSmall,
                        color = accent
                    )
                    Text(
                        text = course.name,
                        style = MaterialTheme.typography.headlineMedium,
                        color = TextPrimary
                    )
                }
            }
        }

        // Hero Card
        item {
            GlassCard(
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("course_hero_card"),
                accentGlow = accent
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Top
                    ) {
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .clip(RoundedCornerShape(14.dp))
                                .background(accent.copy(alpha = 0.25f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Folder,
                                contentDescription = null,
                                tint = accent,
                                modifier = Modifier.size(28.dp)
                            )
                        }

                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(12.dp))
                                .background(Color(0x22FFFFFF))
                                .padding(horizontal = 10.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = "$noteCount ${if (noteCount == 1) "note" else "notes"}",
                                style = MaterialTheme.typography.bodyMedium,
                                color = TextPrimary,
                                fontSize = 12.sp
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))
                    Text(
                        text = course.name,
                        style = MaterialTheme.typography.titleLarge,
                        color = TextPrimary,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = course.description,
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextSecondary
                    )
                }
            }
        }

        // Progress Section
        item {
            GlassInner(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Course Progress",
                            style = MaterialTheme.typography.titleMedium,
                            color = TextPrimary,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = "${sliderProgress.toInt()}%",
                            style = MaterialTheme.typography.titleMedium,
                            color = accent,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Spacer(modifier = Modifier.height(10.dp))
                    Slider(
                        value = sliderProgress,
                        onValueChange = { sliderProgress = it },
                        onValueChangeFinished = { onUpdateProgress(sliderProgress.toInt()) },
                        valueRange = 0f..100f,
                        colors = SliderDefaults.colors(
                            thumbColor = accent,
                            activeTrackColor = accent,
                            inactiveTrackColor = Color(0x22FFFFFF)
                        )
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "$noteCount ${if (noteCount == 1) "note" else "notes"}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextSecondary,
                            fontSize = 12.sp
                        )
                        Text(
                            text = "$collectionCount ${if (collectionCount == 1) "collection" else "collections"}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextSecondary,
                            fontSize = 12.sp
                        )
                    }
                }
            }
        }

        // Course Tools Section Title
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(accent)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Course Tools",
                        style = MaterialTheme.typography.titleLarge,
                        color = TextPrimary
                    )
                }
                Text(
                    text = "${tools.size} tools",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextSecondary
                )
            }
        }

        // Tools List
        itemsIndexed(tools) { index, tool ->
            GlassCard(
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("course_tool_${tool.title.lowercase().replace(" ", "_")}"),
                accentGlow = accent,
                onClick = tool.action
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "0${index + 1}",
                        style = MaterialTheme.typography.labelSmall,
                        color = TextMuted,
                        modifier = Modifier.width(28.dp)
                    )
                    Box(
                        modifier = Modifier
                            .size(38.dp)
                            .clip(CircleShape)
                            .background(accent.copy(alpha = 0.20f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = tool.icon,
                            contentDescription = null,
                            tint = accent
                        )
                    }
                    Spacer(modifier = Modifier.width(14.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = tool.title,
                            style = MaterialTheme.typography.titleMedium,
                            color = TextPrimary,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = tool.description,
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextSecondary,
                            fontSize = 12.sp
                        )
                    }
                    Icon(
                        imageVector = Icons.Default.ChevronRight,
                        contentDescription = null,
                        tint = TextSecondary
                    )
                }
            }
        }
    }
}
