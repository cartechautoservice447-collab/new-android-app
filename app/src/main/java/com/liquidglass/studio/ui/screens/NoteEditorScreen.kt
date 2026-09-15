package com.liquidglass.studio.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckBox
import androidx.compose.material.icons.filled.CheckBoxOutlineBlank
import androidx.compose.material.icons.filled.Code
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.FormatBold
import androidx.compose.material.icons.filled.FormatItalic
import androidx.compose.material.icons.filled.FormatListBulleted
import androidx.compose.material.icons.filled.FormatQuote
import androidx.compose.material.icons.filled.FormatStrikethrough
import androidx.compose.material.icons.filled.Save
import androidx.compose.material.icons.filled.Title
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.liquidglass.studio.data.model.NoteEntity
import com.liquidglass.studio.ui.components.GlassCard
import com.liquidglass.studio.ui.components.GlassInner
import com.liquidglass.studio.ui.theme.AccentAmber
import com.liquidglass.studio.ui.theme.AccentEmerald
import com.liquidglass.studio.ui.theme.AccentRose
import com.liquidglass.studio.ui.theme.AccentSky
import com.liquidglass.studio.ui.theme.AccentViolet
import com.liquidglass.studio.ui.theme.TextMuted
import com.liquidglass.studio.ui.theme.TextPrimary
import com.liquidglass.studio.ui.theme.TextSecondary

@Composable
fun NoteEditorScreen(
    note: NoteEntity,
    onBack: () -> Unit,
    onSave: (String, String) -> Unit,
    onDelete: (String) -> Unit
) {
    var title by remember(note.id) { mutableStateOf(note.title) }
    var content by remember(note.id) { mutableStateOf(note.content) }
    var isPreviewMode by remember { mutableStateOf(false) }
    var showDeleteConfirm by remember { mutableStateOf(false) }
    var lastSavedText by remember { mutableStateOf("Autosaved just now") }

    // Auto-save debouncing
    LaunchedEffect(title, content) {
        kotlinx.coroutines.delay(1000)
        onSave(title, content)
        lastSavedText = "Autosaved"
    }

    val wordCount = remember(content) {
        if (content.isBlank()) 0 else content.trim().split("\\s+".toRegex()).size
    }
    val charCount = remember(content) { content.length }

    fun insertText(prefix: String, suffix: String = "") {
        content = if (content.endsWith("\n") || content.isEmpty()) {
            "$content$prefix$suffix"
        } else {
            "$content\n$prefix$suffix"
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF07111F))
    ) {
        // Topbar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 48.dp, start = 12.dp, end = 12.dp, bottom = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(
                onClick = {
                    onSave(title, content)
                    onBack()
                },
                modifier = Modifier.testTag("note_editor_back")
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = TextPrimary
                )
            }

            // Inline Title Field
            BasicTextField(
                value = title,
                onValueChange = { title = it },
                textStyle = TextStyle(
                    color = TextPrimary,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                ),
                cursorBrush = SolidColor(AccentSky),
                singleLine = true,
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = 8.dp)
                    .testTag("note_title_input")
            )

            // Edit / Preview switch
            IconButton(
                onClick = { isPreviewMode = !isPreviewMode },
                modifier = Modifier.testTag("toggle_preview_button")
            ) {
                Icon(
                    imageVector = if (isPreviewMode) Icons.Default.Edit else Icons.Default.Visibility,
                    contentDescription = if (isPreviewMode) "Edit Mode" else "Preview Mode",
                    tint = AccentSky
                )
            }

            IconButton(
                onClick = { showDeleteConfirm = true },
                modifier = Modifier.testTag("delete_note_button")
            ) {
                Icon(
                    imageVector = Icons.Default.Delete,
                    contentDescription = "Delete Note",
                    tint = AccentRose
                )
            }

            IconButton(
                onClick = {
                    onSave(title, content)
                    lastSavedText = "Saved"
                },
                modifier = Modifier.testTag("save_note_button")
            ) {
                Icon(
                    imageVector = Icons.Default.Save,
                    contentDescription = "Save Note",
                    tint = AccentEmerald
                )
            }
        }

        // Markdown toolbar (shown in edit mode)
        if (!isPreviewMode) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState())
                    .background(Color(0x14FFFFFF))
                    .padding(horizontal = 12.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                ToolbarButton(label = "H1") { insertText("# ") }
                ToolbarButton(label = "H2") { insertText("## ") }
                ToolbarButton(label = "H3") { insertText("### ") }
                ToolbarIconButton(icon = Icons.Default.FormatBold) { insertText("**", "**") }
                ToolbarIconButton(icon = Icons.Default.FormatItalic) { insertText("_", "_") }
                ToolbarIconButton(icon = Icons.Default.FormatStrikethrough) { insertText("~~", "~~") }
                ToolbarIconButton(icon = Icons.Default.FormatListBulleted) { insertText("- ") }
                ToolbarIconButton(icon = Icons.Default.CheckBox) { insertText("- [ ] ") }
                ToolbarIconButton(icon = Icons.Default.Code) { insertText("`", "`") }
                ToolbarIconButton(icon = Icons.Default.FormatQuote) { insertText("> ") }
                ToolbarButton(label = "</> Code") { insertText("```python\n", "\n```") }
                ToolbarButton(label = "TIP", color = AccentEmerald) { insertText("> [!TIP]\n> ") }
                ToolbarButton(label = "NOTE", color = AccentSky) { insertText("> [!NOTE]\n> ") }
                ToolbarButton(label = "WARN", color = AccentAmber) { insertText("> [!WARNING]\n> ") }
                ToolbarButton(label = "IMPORTANT", color = AccentRose) { insertText("> [!IMPORTANT]\n> ") }
            }
        }

        // Content Area
        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            if (isPreviewMode) {
                MarkdownPreview(
                    content = content,
                    modifier = Modifier.fillMaxSize()
                )
            } else {
                BasicTextField(
                    value = content,
                    onValueChange = { content = it },
                    textStyle = TextStyle(
                        color = TextPrimary,
                        fontSize = 15.sp,
                        lineHeight = 22.sp,
                        fontFamily = FontFamily.Default
                    ),
                    cursorBrush = SolidColor(AccentSky),
                    modifier = Modifier
                        .fillMaxSize()
                        .testTag("note_content_input")
                )
            }
        }

        // Bottom Stats Bar
        GlassInner(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "$wordCount words · $charCount chars",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextMuted,
                    fontSize = 12.sp
                )
                Text(
                    text = lastSavedText,
                    style = MaterialTheme.typography.bodyMedium,
                    color = AccentEmerald,
                    fontSize = 12.sp
                )
            }
        }
    }

    if (showDeleteConfirm) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = false },
            containerColor = Color(0xFF0F1E36),
            title = {
                Text("Delete Note?", color = TextPrimary, fontWeight = FontWeight.Bold)
            },
            text = {
                Text("This note will be permanently deleted from this collection.", color = TextSecondary)
            },
            confirmButton = {
                Button(
                    onClick = {
                        onDelete(note.id)
                        showDeleteConfirm = false
                        onBack()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = AccentRose)
                ) {
                    Text("Delete", color = Color.White, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirm = false }) {
                    Text("Cancel", color = TextSecondary)
                }
            }
        )
    }
}

@Composable
fun ToolbarButton(
    label: String,
    color: Color = AccentSky,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(color.copy(alpha = 0.20f))
            .border(1.dp, color.copy(alpha = 0.40f), RoundedCornerShape(8.dp))
            .padding(horizontal = 10.dp, vertical = 6.dp)
            .testTag("tool_${label.lowercase()}")
    ) {
        Text(
            text = label,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            color = color,
            modifier = Modifier.padding(1.dp)
        )
    }
}

@Composable
fun ToolbarIconButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .size(32.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(Color(0x1FFFFFFF))
            .padding(4.dp),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = TextPrimary,
            modifier = Modifier.size(16.dp)
        )
    }
}

@Composable
fun MarkdownPreview(
    content: String,
    modifier: Modifier = Modifier
) {
    val lines = remember(content) { content.split("\n") }

    Column(
        modifier = modifier
            .verticalScroll(rememberScrollState())
            .padding(bottom = 64.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        if (content.isBlank()) {
            Text(
                text = "Empty preview. Start writing your note to see formatted output.",
                style = MaterialTheme.typography.bodyMedium,
                color = TextMuted
            )
        }

        var inCodeBlock = false
        var codeBlockBuffer = StringBuilder()

        for (line in lines) {
            val trimmed = line.trim()

            if (trimmed.startsWith("```")) {
                if (inCodeBlock) {
                    // end code block
                    val code = codeBlockBuffer.toString()
                    GlassCard(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Text(
                                text = "Code",
                                style = MaterialTheme.typography.labelSmall,
                                color = AccentSky
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = code,
                                color = TextPrimary,
                                fontFamily = FontFamily.Monospace,
                                fontSize = 13.sp,
                                lineHeight = 18.sp
                            )
                        }
                    }
                    codeBlockBuffer = StringBuilder()
                    inCodeBlock = false
                } else {
                    inCodeBlock = true
                }
                continue
            }

            if (inCodeBlock) {
                codeBlockBuffer.append(line).append("\n")
                continue
            }

            when {
                trimmed.startsWith("# ") -> {
                    Text(
                        text = trimmed.removePrefix("# "),
                        style = MaterialTheme.typography.headlineLarge,
                        color = TextPrimary,
                        fontWeight = FontWeight.Bold
                    )
                }
                trimmed.startsWith("## ") -> {
                    Text(
                        text = trimmed.removePrefix("## "),
                        style = MaterialTheme.typography.headlineMedium,
                        color = TextPrimary,
                        fontWeight = FontWeight.Bold
                    )
                }
                trimmed.startsWith("### ") -> {
                    Text(
                        text = trimmed.removePrefix("### "),
                        style = MaterialTheme.typography.titleLarge,
                        color = AccentSky,
                        fontWeight = FontWeight.SemiBold
                    )
                }
                trimmed.startsWith("> [!TIP]") -> {
                    CalloutCard(label = "TIP", color = AccentEmerald, text = trimmed.removePrefix("> [!TIP]"))
                }
                trimmed.startsWith("> [!NOTE]") -> {
                    CalloutCard(label = "NOTE", color = AccentSky, text = trimmed.removePrefix("> [!NOTE]"))
                }
                trimmed.startsWith("> [!WARNING]") -> {
                    CalloutCard(label = "WARNING", color = AccentAmber, text = trimmed.removePrefix("> [!WARNING]"))
                }
                trimmed.startsWith("> [!IMPORTANT]") -> {
                    CalloutCard(label = "IMPORTANT", color = AccentRose, text = trimmed.removePrefix("> [!IMPORTANT]"))
                }
                trimmed.startsWith("- [x] ") || trimmed.startsWith("- [X] ") -> {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.CheckBox,
                            contentDescription = null,
                            tint = AccentEmerald,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = trimmed.substring(6),
                            style = MaterialTheme.typography.bodyLarge,
                            color = TextSecondary
                        )
                    }
                }
                trimmed.startsWith("- [ ] ") -> {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.CheckBoxOutlineBlank,
                            contentDescription = null,
                            tint = TextMuted,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = trimmed.removePrefix("- [ ] "),
                            style = MaterialTheme.typography.bodyLarge,
                            color = TextPrimary
                        )
                    }
                }
                trimmed.startsWith("- ") -> {
                    Row(verticalAlignment = Alignment.Top) {
                        Text(text = "•", color = AccentSky, fontSize = 18.sp, modifier = Modifier.padding(end = 8.dp))
                        Text(
                            text = trimmed.removePrefix("- "),
                            style = MaterialTheme.typography.bodyLarge,
                            color = TextPrimary
                        )
                    }
                }
                trimmed.startsWith("> ") -> {
                    GlassInner(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp)
                    ) {
                        Text(
                            text = trimmed.removePrefix("> "),
                            style = MaterialTheme.typography.bodyLarge,
                            color = TextSecondary,
                            fontStyle = androidx.compose.ui.text.font.FontStyle.Italic,
                            modifier = Modifier.padding(12.dp)
                        )
                    }
                }
                trimmed.isNotEmpty() -> {
                    Text(
                        text = trimmed,
                        style = MaterialTheme.typography.bodyLarge,
                        color = TextPrimary,
                        lineHeight = 22.sp
                    )
                }
            }
        }
    }
}

@Composable
fun CalloutCard(label: String, color: Color, text: String) {
    GlassCard(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        accentGlow = color,
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                color = color
            )
            if (text.isNotBlank()) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = text.trim(),
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextPrimary
                )
            }
        }
    }
}
