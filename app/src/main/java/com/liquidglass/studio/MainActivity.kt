package com.liquidglass.studio

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.liquidglass.studio.ui.MainViewModel
import com.liquidglass.studio.ui.components.LiquidBackground
import com.liquidglass.studio.ui.screens.CollectionsScreen
import com.liquidglass.studio.ui.screens.CourseWorkspaceScreen
import com.liquidglass.studio.ui.screens.DailyPlannerScreen
import com.liquidglass.studio.ui.screens.DashboardScreen
import com.liquidglass.studio.ui.screens.EngineSettingsDialog
import com.liquidglass.studio.ui.screens.NoteEditorScreen
import com.liquidglass.studio.ui.screens.StudySessionScreen
import com.liquidglass.studio.ui.theme.LiquidGlassTheme

enum class Screen {
    DASHBOARD,
    COURSE_WORKSPACE,
    COLLECTIONS,
    NOTE_EDITOR,
    STUDY_SESSION,
    DAILY_PLANNER
}

class MainActivity : ComponentActivity() {

    private val viewModel: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            val engineSettings by viewModel.engineSettings.collectAsState()
            val courses by viewModel.courses.collectAsState()
            val totalNotes by viewModel.totalNotesCount.collectAsState()
            val selectedCourse by viewModel.selectedCourse.collectAsState()
            val selectedCollection by viewModel.selectedCollection.collectAsState()
            val collections by viewModel.currentCourseCollections.collectAsState()
            val notes by viewModel.currentCourseAllNotes.collectAsState()
            val collectionNotes by viewModel.currentCollectionNotes.collectAsState()
            val activeNote by viewModel.activeNote.collectAsState()
            val plannerItems by viewModel.plannerItems.collectAsState()

            var currentScreen by remember { mutableStateOf(Screen.DASHBOARD) }
            var showSettingsDialog by remember { mutableStateOf(false) }

            // Back handler logic matching the original mobile app
            BackHandler(enabled = currentScreen != Screen.DASHBOARD) {
                when (currentScreen) {
                    Screen.NOTE_EDITOR -> currentScreen = Screen.COLLECTIONS
                    Screen.COLLECTIONS -> currentScreen = Screen.COURSE_WORKSPACE
                    Screen.COURSE_WORKSPACE -> currentScreen = Screen.DASHBOARD
                    Screen.STUDY_SESSION -> currentScreen = if (selectedCourse != null) Screen.COURSE_WORKSPACE else Screen.DASHBOARD
                    Screen.DAILY_PLANNER -> currentScreen = Screen.DASHBOARD
                    Screen.DASHBOARD -> finish()
                }
            }

            LiquidGlassTheme(darkTheme = engineSettings.theme == "dark") {
                LiquidBackground(darkTheme = engineSettings.theme == "dark") {
                    when (currentScreen) {
                        Screen.DASHBOARD -> {
                            DashboardScreen(
                                courses = courses,
                                totalNotes = totalNotes,
                                engineSettings = engineSettings,
                                onCourseClick = { course ->
                                    viewModel.selectCourse(course)
                                    currentScreen = Screen.COURSE_WORKSPACE
                                },
                                onAddCourse = { name, desc, color ->
                                    viewModel.createCourse(name, desc, color)
                                },
                                onDeleteCourse = { id ->
                                    viewModel.deleteCourse(id)
                                },
                                onOpenDailyPlanner = { currentScreen = Screen.DAILY_PLANNER },
                                onOpenStudySession = { currentScreen = Screen.STUDY_SESSION },
                                onToggleTheme = { viewModel.toggleTheme() },
                                onPerformanceChange = { mode -> viewModel.updatePerformanceMode(mode) },
                                onOpenSettings = { showSettingsDialog = true }
                            )
                        }

                        Screen.COURSE_WORKSPACE -> {
                            selectedCourse?.let { course ->
                                CourseWorkspaceScreen(
                                    course = course,
                                    collections = collections,
                                    notes = notes,
                                    onBack = { currentScreen = Screen.DASHBOARD },
                                    onOpenCollections = { currentScreen = Screen.COLLECTIONS },
                                    onOpenAllNotes = { currentScreen = Screen.COLLECTIONS },
                                    onOpenStudySession = { currentScreen = Screen.STUDY_SESSION },
                                    onUpdateProgress = { progress -> viewModel.updateCourseProgress(progress) }
                                )
                            } ?: run {
                                currentScreen = Screen.DASHBOARD
                            }
                        }

                        Screen.COLLECTIONS -> {
                            selectedCourse?.let { course ->
                                CollectionsScreen(
                                    course = course,
                                    collections = collections,
                                    notes = notes,
                                    selectedCollection = selectedCollection,
                                    collectionNotes = collectionNotes,
                                    onBack = {
                                        if (selectedCollection != null) {
                                            viewModel.selectCourse(course)
                                        } else {
                                            currentScreen = Screen.COURSE_WORKSPACE
                                        }
                                    },
                                    onSelectCollection = { col ->
                                        viewModel.selectCollection(col)
                                    },
                                    onCreateCollection = { title ->
                                        viewModel.createCollection(course.id, title)
                                    },
                                    onSelectNote = { note ->
                                        viewModel.selectNote(note)
                                        currentScreen = Screen.NOTE_EDITOR
                                    },
                                    onCreateNote = { colId, title ->
                                        viewModel.createNote(colId, title)
                                        currentScreen = Screen.NOTE_EDITOR
                                    }
                                )
                            } ?: run {
                                currentScreen = Screen.DASHBOARD
                            }
                        }

                        Screen.NOTE_EDITOR -> {
                            activeNote?.let { note ->
                                NoteEditorScreen(
                                    note = note,
                                    onBack = { currentScreen = Screen.COLLECTIONS },
                                    onSave = { title, content ->
                                        viewModel.updateNote(title, content)
                                    },
                                    onDelete = { id ->
                                        viewModel.deleteNote(id)
                                    }
                                )
                            } ?: run {
                                currentScreen = Screen.COLLECTIONS
                            }
                        }

                        Screen.STUDY_SESSION -> {
                            StudySessionScreen(
                                courseName = selectedCourse?.name ?: "CS50 Lectures",
                                onBack = {
                                    currentScreen = if (selectedCourse != null) Screen.COURSE_WORKSPACE else Screen.DASHBOARD
                                }
                            )
                        }

                        Screen.DAILY_PLANNER -> {
                            DailyPlannerScreen(
                                items = plannerItems,
                                onBack = { currentScreen = Screen.DASHBOARD },
                                onToggleItem = { id, completed ->
                                    viewModel.togglePlannerItem(id, completed)
                                },
                                onAddItem = { title, type, recurrence, date, time ->
                                    viewModel.addPlannerItem(title, type, recurrence, date, time)
                                },
                                onDeleteItem = { item ->
                                    viewModel.deletePlannerItem(item)
                                }
                            )
                        }
                    }

                    if (showSettingsDialog) {
                        EngineSettingsDialog(
                            settings = engineSettings,
                            onDismiss = { showSettingsDialog = false },
                            onSave = { updated ->
                                viewModel.updateEngineSettings(updated)
                            }
                        )
                    }
                }
            }
        }
    }
}
