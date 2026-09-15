package com.liquidglass.studio.ui.screens

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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Alarm
import androidx.compose.material.icons.filled.Assignment
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.CheckBox
import androidx.compose.material.icons.filled.CheckBoxOutlineBlank
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Work
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.liquidglass.studio.data.model.PlannerItemEntity
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

fun getPlannerTypeColor(type: String): Color {
    return when (type.lowercase()) {
        "reminder" -> AccentSky
        "exam" -> AccentRose
        "project" -> AccentViolet
        "deadline" -> AccentAmber
        else -> AccentEmerald
    }
}

fun getPlannerTypeIcon(type: String): ImageVector {
    return when (type.lowercase()) {
        "reminder" -> Icons.Default.Notifications
        "exam" -> Icons.Default.Assignment
        "project" -> Icons.Default.Work
        "deadline" -> Icons.Default.Alarm
        else -> Icons.Default.CalendarToday
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DailyPlannerScreen(
    items: List<PlannerItemEntity>,
    onBack: () -> Unit,
    onToggleItem: (String, Boolean) -> Unit,
    onAddItem: (String, String, String, String, String) -> Unit,
    onDeleteItem: (PlannerItemEntity) -> Unit
) {
    var showAddDialog by remember { mutableStateOf(false) }
    var selectedFilter by remember { mutableStateOf("all") }

    val filteredItems = remember(items, selectedFilter) {
        when (selectedFilter) {
            "reminders" -> items.filter { it.type == "reminder" }
            "exams" -> items.filter { it.type == "exam" || it.type == "deadline" }
            else -> items
        }
    }

    val completedCount = items.count { it.isCompleted }
    val pendingCount = items.size - completedCount

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
                    modifier = Modifier.testTag("planner_back_button")
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Back",
                        tint = TextPrimary
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "STUDY SCHEDULE",
                        style = MaterialTheme.typography.labelSmall,
                        color = AccentSky
                    )
                    Text(
                        text = "Daily Planner",
                        style = MaterialTheme.typography.headlineMedium,
                        color = TextPrimary
                    )
                }
                IconButton(
                    onClick = { showAddDialog = true },
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(AccentSky)
                        .testTag("add_planner_item_button")
                ) {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = "Add Task",
                        tint = Color(0xFF07111F)
                    )
                }
            }
        }

        // Summary Card
        item {
            GlassCard(
                modifier = Modifier.fillMaxWidth(),
                accentGlow = AccentSky
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp),
                    horizontalArrangement = Arrangement.SpaceAround,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "$pendingCount",
                            fontSize = 28.sp,
                            fontWeight = FontWeight.Bold,
                            color = AccentSky
                        )
                        Text(
                            text = "Pending Tasks",
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextSecondary,
                            fontSize = 12.sp
                        )
                    }

                    Box(
                        modifier = Modifier
                            .width(1.dp)
                            .height(36.dp)
                            .background(Color(0x33FFFFFF))
                    )

                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "$completedCount",
                            fontSize = 28.sp,
                            fontWeight = FontWeight.Bold,
                            color = AccentEmerald
                        )
                        Text(
                            text = "Completed",
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextSecondary,
                            fontSize = 12.sp
                        )
                    }
                }
            }
        }

        // Filter Tabs
        item {
            GlassInner(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(6.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    listOf("all" to "All", "reminders" to "Reminders", "exams" to "Exams & Deadlines").forEach { (key, label) ->
                        val isSelected = selectedFilter == key
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(10.dp))
                                .background(if (isSelected) AccentSky else Color.Transparent)
                                .clickable { selectedFilter = key }
                                .padding(vertical = 8.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = label,
                                fontSize = 12.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                color = if (isSelected) Color(0xFF07111F) else TextSecondary
                            )
                        }
                    }
                }
            }
        }

        if (filteredItems.isEmpty()) {
            item {
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "No planner items found",
                            style = MaterialTheme.typography.titleMedium,
                            color = TextPrimary
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Tap the + button above to schedule a reminder, exam, or study deadline.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextSecondary
                        )
                    }
                }
            }
        } else {
            items(filteredItems, key = { it.id }) { item ->
                val typeColor = getPlannerTypeColor(item.type)
                val typeIcon = getPlannerTypeIcon(item.type)

                GlassCard(
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("planner_item_${item.id}"),
                    accentGlow = if (item.isCompleted) null else typeColor
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(
                            onClick = { onToggleItem(item.id, !item.isCompleted) },
                            modifier = Modifier.testTag("toggle_item_${item.id}")
                        ) {
                            Icon(
                                imageVector = if (item.isCompleted) Icons.Default.CheckBox else Icons.Default.CheckBoxOutlineBlank,
                                contentDescription = if (item.isCompleted) "Completed" else "Mark Complete",
                                tint = if (item.isCompleted) AccentEmerald else TextSecondary
                            )
                        }

                        Spacer(modifier = Modifier.width(8.dp))

                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = item.title,
                                style = MaterialTheme.typography.titleMedium,
                                color = if (item.isCompleted) TextMuted else TextPrimary,
                                textDecoration = if (item.isCompleted) TextDecoration.LineThrough else TextDecoration.None,
                                fontWeight = FontWeight.SemiBold
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(typeColor.copy(alpha = 0.20f))
                                        .padding(horizontal = 6.dp, vertical = 2.dp)
                                ) {
                                    Text(
                                        text = item.type.uppercase(),
                                        style = MaterialTheme.typography.labelSmall,
                                        color = typeColor,
                                        fontSize = 9.sp
                                    )
                                }
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "${item.notifyTime} · ${item.recurrence}",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = TextSecondary,
                                    fontSize = 11.sp
                                )
                            }
                        }

                        IconButton(
                            onClick = { onDeleteItem(item) },
                            modifier = Modifier.testTag("delete_item_${item.id}")
                        ) {
                            Icon(
                                imageVector = Icons.Default.Delete,
                                contentDescription = "Delete item",
                                tint = TextMuted
                            )
                        }
                    }
                }
            }
        }
    }

    if (showAddDialog) {
        AddPlannerItemDialog(
            onDismiss = { showAddDialog = false },
            onConfirm = { title, type, recurrence, date, time ->
                onAddItem(title, type, recurrence, date, time)
                showAddDialog = false
            }
        )
    }
}

@Composable
fun AddPlannerItemDialog(
    onDismiss: () -> Unit,
    onConfirm: (String, String, String, String, String) -> Unit
) {
    var title by remember { mutableStateOf("") }
    var selectedType by remember { mutableStateOf("reminder") }
    var selectedRecurrence by remember { mutableStateOf("daily") }
    var notifyTime by remember { mutableStateOf("09:00") }
    var specificDate by remember { mutableStateOf("") }

    val types = listOf("reminder" to "Reminder", "exam" to "Exam", "project" to "Project", "deadline" to "Deadline")
    val recurrences = listOf("daily" to "Daily", "weekdays" to "Weekdays", "specific" to "Specific Date")

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Color(0xFF0F1E36),
        title = {
            Text(text = "Add Planner Item", color = TextPrimary, fontWeight = FontWeight.Bold)
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    label = { Text("Task / Title", color = TextSecondary) },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary,
                        focusedBorderColor = AccentSky,
                        unfocusedBorderColor = Color(0x33FFFFFF)
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                Text(text = "Category", style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    types.forEach { (typeKey, typeLabel) ->
                        val isSelected = selectedType == typeKey
                        val color = getPlannerTypeColor(typeKey)
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(8.dp))
                                .background(if (isSelected) color else Color(0x1AFFFFFF))
                                .clickable { selectedType = typeKey }
                                .padding(vertical = 6.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = typeLabel,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isSelected) Color(0xFF07111F) else TextPrimary
                            )
                        }
                    }
                }

                Text(text = "Time", style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
                OutlinedTextField(
                    value = notifyTime,
                    onValueChange = { notifyTime = it },
                    placeholder = { Text("e.g. 09:00", color = TextMuted) },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary,
                        focusedBorderColor = AccentSky,
                        unfocusedBorderColor = Color(0x33FFFFFF)
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                Text(text = "Recurrence", style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    recurrences.forEach { (recKey, recLabel) ->
                        val isSelected = selectedRecurrence == recKey
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(8.dp))
                                .background(if (isSelected) AccentSky else Color(0x1AFFFFFF))
                                .clickable { selectedRecurrence = recKey }
                                .padding(vertical = 6.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = recLabel,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isSelected) Color(0xFF07111F) else TextPrimary
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (title.isNotBlank()) {
                        onConfirm(title.trim(), selectedType, selectedRecurrence, specificDate, notifyTime)
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = AccentSky)
            ) {
                Text("Add Item", color = Color(0xFF07111F), fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = TextSecondary)
            }
        }
    )
}
