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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
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
import com.liquidglass.studio.data.model.CollectionEntity
import com.liquidglass.studio.data.model.CourseEntity
import com.liquidglass.studio.data.model.NoteEntity
import com.liquidglass.studio.ui.components.GlassCard
import com.liquidglass.studio.ui.components.getCourseAccentColor
import com.liquidglass.studio.ui.theme.AccentSky
import com.liquidglass.studio.ui.theme.TextMuted
import com.liquidglass.studio.ui.theme.TextPrimary
import com.liquidglass.studio.ui.theme.TextSecondary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CollectionsScreen(
    course: CourseEntity,
    collections: List<CollectionEntity>,
    notes: List<NoteEntity>,
    selectedCollection: CollectionEntity?,
    collectionNotes: List<NoteEntity>,
    onBack: () -> Unit,
    onSelectCollection: (CollectionEntity) -> Unit,
    onCreateCollection: (String) -> Unit,
    onSelectNote: (NoteEntity) -> Unit,
    onCreateNote: (String, String) -> Unit
) {
    val accent = getCourseAccentColor(course.color)
    var newCollectionTitle by remember { mutableStateOf("") }
    var newNoteTitle by remember { mutableStateOf("") }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        contentPadding = PaddingValues(top = 48.dp, bottom = 96.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Header
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(
                    onClick = onBack,
                    modifier = Modifier.testTag("collections_back_button")
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
                        text = course.name.uppercase(),
                        style = MaterialTheme.typography.labelSmall,
                        color = accent
                    )
                    Text(
                        text = if (selectedCollection == null) "Collections" else selectedCollection.title,
                        style = MaterialTheme.typography.headlineMedium,
                        color = TextPrimary
                    )
                }
            }
        }

        if (selectedCollection == null) {
            // Add collection inline input
            item {
                GlassCard(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedTextField(
                            value = newCollectionTitle,
                            onValueChange = { newCollectionTitle = it },
                            placeholder = { Text("New collection name...", color = TextMuted) },
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = TextPrimary,
                                unfocusedTextColor = TextPrimary,
                                focusedBorderColor = Color.Transparent,
                                unfocusedBorderColor = Color.Transparent
                            ),
                            modifier = Modifier
                                .weight(1f)
                                .testTag("new_collection_input")
                        )
                        IconButton(
                            onClick = {
                                if (newCollectionTitle.isNotBlank()) {
                                    onCreateCollection(newCollectionTitle.trim())
                                    newCollectionTitle = ""
                                }
                            },
                            modifier = Modifier
                                .clip(RoundedCornerShape(12.dp))
                                .background(accent)
                                .testTag("add_collection_button")
                        ) {
                            Icon(
                                imageVector = Icons.Default.Add,
                                contentDescription = "Add Collection",
                                tint = Color(0xFF07111F)
                            )
                        }
                    }
                }
            }

            // Collections list
            itemsIndexed(collections, key = { _, col -> col.id }) { index, collection ->
                val colNotesCount = notes.count { it.collectionId == collection.id }
                GlassCard(
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("collection_item_${collection.id}"),
                    accentGlow = accent,
                    onClick = { onSelectCollection(collection) }
                ) {
                    Row(
                        modifier = Modifier.padding(18.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = String.format("%02d", index + 1),
                            style = MaterialTheme.typography.labelSmall,
                            color = TextMuted,
                            modifier = Modifier.width(32.dp)
                        )
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(accent.copy(alpha = 0.20f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Folder,
                                contentDescription = null,
                                tint = accent
                            )
                        }
                        Spacer(modifier = Modifier.width(14.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = collection.title,
                                style = MaterialTheme.typography.titleMedium,
                                color = TextPrimary,
                                fontWeight = FontWeight.Bold
                            )
                            if (collection.description.isNotBlank()) {
                                Text(
                                    text = collection.description,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = TextSecondary,
                                    fontSize = 12.sp
                                )
                            }
                        }
                        Text(
                            text = "$colNotesCount ${if (colNotesCount == 1) "note" else "notes"}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextSecondary,
                            fontSize = 12.sp
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Icon(
                            imageVector = Icons.Default.ChevronRight,
                            contentDescription = null,
                            tint = TextSecondary
                        )
                    }
                }
            }
        } else {
            // Viewing notes inside selected collection
            item {
                GlassCard(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedTextField(
                            value = newNoteTitle,
                            onValueChange = { newNoteTitle = it },
                            placeholder = { Text("New note title...", color = TextMuted) },
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = TextPrimary,
                                unfocusedTextColor = TextPrimary,
                                focusedBorderColor = Color.Transparent,
                                unfocusedBorderColor = Color.Transparent
                            ),
                            modifier = Modifier
                                .weight(1f)
                                .testTag("new_note_input")
                        )
                        IconButton(
                            onClick = {
                                if (newNoteTitle.isNotBlank()) {
                                    onCreateNote(selectedCollection.id, newNoteTitle.trim())
                                    newNoteTitle = ""
                                }
                            },
                            modifier = Modifier
                                .clip(RoundedCornerShape(12.dp))
                                .background(accent)
                                .testTag("add_note_button")
                        ) {
                            Icon(
                                imageVector = Icons.Default.Add,
                                contentDescription = "Add Note",
                                tint = Color(0xFF07111F)
                            )
                        }
                    }
                }
            }

            if (collectionNotes.isEmpty()) {
                item {
                    GlassCard(modifier = Modifier.fillMaxWidth()) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(32.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = "No notes in this collection yet",
                                style = MaterialTheme.typography.titleMedium,
                                color = TextPrimary
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "Type a title above and tap + to start writing.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = TextSecondary
                            )
                        }
                    }
                }
            } else {
                items(collectionNotes, key = { it.id }) { note ->
                    GlassCard(
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("note_item_${note.id}"),
                        accentGlow = accent,
                        onClick = { onSelectNote(note) }
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(CircleShape)
                                    .background(accent.copy(alpha = 0.20f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Description,
                                    contentDescription = null,
                                    tint = accent
                                )
                            }
                            Spacer(modifier = Modifier.width(14.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = note.title.ifBlank { "Untitled Note" },
                                    style = MaterialTheme.typography.titleMedium,
                                    color = TextPrimary,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = if (note.content.isNotBlank()) note.content.take(80) else "Empty note",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = TextSecondary,
                                    maxLines = 1
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
    }
}
