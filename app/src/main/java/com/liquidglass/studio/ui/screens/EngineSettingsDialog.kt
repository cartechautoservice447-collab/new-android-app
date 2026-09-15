package com.liquidglass.studio.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.liquidglass.studio.data.model.EngineSettings
import com.liquidglass.studio.ui.theme.AccentSky
import com.liquidglass.studio.ui.theme.AccentViolet
import com.liquidglass.studio.ui.theme.TextPrimary
import com.liquidglass.studio.ui.theme.TextSecondary

@Composable
fun EngineSettingsDialog(
    settings: EngineSettings,
    onDismiss: () -> Unit,
    onSave: (EngineSettings) -> Unit
) {
    var displayName by remember { mutableStateOf(settings.displayName) }
    var density by remember { mutableFloatStateOf(settings.liquidDensity) }
    var transparency by remember { mutableFloatStateOf(settings.liquidTransparency) }
    var gel by remember { mutableFloatStateOf(settings.liquidGel) }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Color(0xFF0F1E36),
        title = {
            Column {
                Text(
                    text = "ENGINE SETTINGS",
                    style = MaterialTheme.typography.labelSmall,
                    color = AccentSky
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "Liquid Glass Physics",
                    style = MaterialTheme.typography.titleLarge,
                    color = TextPrimary,
                    fontWeight = FontWeight.Bold
                )
            }
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                OutlinedTextField(
                    value = displayName,
                    onValueChange = { displayName = it },
                    label = { Text("Display Name", color = TextSecondary) },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary,
                        focusedBorderColor = AccentSky,
                        unfocusedBorderColor = Color(0x33FFFFFF)
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("settings_display_name_input")
                )

                // Density slider
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(text = "Liquid Density", style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
                        Text(text = "${density.toInt()}px", style = MaterialTheme.typography.bodyMedium, color = AccentSky, fontWeight = FontWeight.Bold)
                    }
                    Slider(
                        value = density,
                        onValueChange = { density = it },
                        valueRange = 4f..32f,
                        colors = SliderDefaults.colors(thumbColor = AccentSky, activeTrackColor = AccentSky, inactiveTrackColor = Color(0x22FFFFFF))
                    )
                }

                // Transparency slider
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(text = "Glass Transparency", style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
                        Text(text = "${(transparency * 100).toInt()}%", style = MaterialTheme.typography.bodyMedium, color = AccentViolet, fontWeight = FontWeight.Bold)
                    }
                    Slider(
                        value = transparency,
                        onValueChange = { transparency = it },
                        valueRange = 0.1f..0.9f,
                        colors = SliderDefaults.colors(thumbColor = AccentViolet, activeTrackColor = AccentViolet, inactiveTrackColor = Color(0x22FFFFFF))
                    )
                }

                // Gel elasticity slider
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(text = "Gel Elasticity", style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
                        Text(text = "${(gel * 100).toInt()}%", style = MaterialTheme.typography.bodyMedium, color = AccentSky, fontWeight = FontWeight.Bold)
                    }
                    Slider(
                        value = gel,
                        onValueChange = { gel = it },
                        valueRange = 0.2f..1.0f,
                        colors = SliderDefaults.colors(thumbColor = AccentSky, activeTrackColor = AccentSky, inactiveTrackColor = Color(0x22FFFFFF))
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    onSave(
                        settings.copy(
                            displayName = displayName.ifBlank { "Scholar" },
                            liquidDensity = density,
                            liquidTransparency = transparency,
                            liquidGel = gel
                        )
                    )
                    onDismiss()
                },
                colors = ButtonDefaults.buttonColors(containerColor = AccentSky),
                modifier = Modifier.testTag("save_settings_button")
            ) {
                Text("Save Settings", color = Color(0xFF07111F), fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = TextSecondary)
            }
        }
    )
}
