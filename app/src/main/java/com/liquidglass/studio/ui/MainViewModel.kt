package com.liquidglass.studio.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.liquidglass.studio.data.local.AppDatabase
import com.liquidglass.studio.data.model.CollectionEntity
import com.liquidglass.studio.data.model.CourseEntity
import com.liquidglass.studio.data.model.EngineSettings
import com.liquidglass.studio.data.model.NoteEntity
import com.liquidglass.studio.data.model.PlannerItemEntity
import com.liquidglass.studio.data.repository.WorkspaceRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class MainViewModel(application: Application) : AndroidViewModel(application) {

    private val repository: WorkspaceRepository

    init {
        val db = AppDatabase.getDatabase(application, viewModelScope)
        repository = WorkspaceRepository(
            db.courseDao(),
            db.collectionDao(),
            db.noteDao(),
            db.plannerDao()
        )
    }

    val courses: StateFlow<List<CourseEntity>> = repository.allCourses.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = emptyList()
    )

    val totalNotesCount: StateFlow<Int> = repository.totalNotesCount.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = 0
    )

    val plannerItems: StateFlow<List<PlannerItemEntity>> = repository.allPlannerItems.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = emptyList()
    )

    private val _selectedCourse = MutableStateFlow<CourseEntity?>(null)
    val selectedCourse: StateFlow<CourseEntity?> = _selectedCourse.asStateFlow()

    private val _selectedCollection = MutableStateFlow<CollectionEntity?>(null)
    val selectedCollection: StateFlow<CollectionEntity?> = _selectedCollection.asStateFlow()

    private val _currentCourseCollections = MutableStateFlow<List<CollectionEntity>>(emptyList())
    val currentCourseCollections: StateFlow<List<CollectionEntity>> = _currentCourseCollections.asStateFlow()

    private val _currentCollectionNotes = MutableStateFlow<List<NoteEntity>>(emptyList())
    val currentCollectionNotes: StateFlow<List<NoteEntity>> = _currentCollectionNotes.asStateFlow()

    private val _currentCourseAllNotes = MutableStateFlow<List<NoteEntity>>(emptyList())
    val currentCourseAllNotes: StateFlow<List<NoteEntity>> = _currentCourseAllNotes.asStateFlow()

    private val _activeNote = MutableStateFlow<NoteEntity?>(null)
    val activeNote: StateFlow<NoteEntity?> = _activeNote.asStateFlow()

    private val _engineSettings = MutableStateFlow(EngineSettings())
    val engineSettings: StateFlow<EngineSettings> = _engineSettings.asStateFlow()

    fun selectCourse(course: CourseEntity) {
        _selectedCourse.value = course
        viewModelScope.launch {
            repository.getCollectionsForCourse(course.id).collect { collections ->
                _currentCourseCollections.value = collections
            }
        }
        viewModelScope.launch {
            repository.getAllNotesForCourse(course.id).collect { notes ->
                _currentCourseAllNotes.value = notes
            }
        }
    }

    fun selectCollection(collection: CollectionEntity) {
        _selectedCollection.value = collection
        viewModelScope.launch {
            repository.getNotesForCollection(collection.id).collect { notes ->
                _currentCollectionNotes.value = notes
            }
        }
    }

    fun selectNote(note: NoteEntity) {
        _activeNote.value = note
    }

    fun createCourse(name: String, description: String, color: String) {
        viewModelScope.launch {
            val course = repository.createCourse(name, description, color)
            selectCourse(course)
        }
    }

    fun updateCourseProgress(progress: Int) {
        val current = _selectedCourse.value ?: return
        val updated = current.copy(progress = progress.coerceIn(0, 100))
        _selectedCourse.value = updated
        viewModelScope.launch {
            repository.updateCourse(updated)
        }
    }

    fun deleteCourse(courseId: String) {
        viewModelScope.launch {
            repository.deleteCourse(courseId)
            if (_selectedCourse.value?.id == courseId) {
                _selectedCourse.value = null
            }
        }
    }

    fun createCollection(courseId: String, title: String, description: String = "") {
        viewModelScope.launch {
            repository.createCollection(courseId, title, description)
        }
    }

    fun createNote(collectionId: String, title: String, content: String = "") {
        viewModelScope.launch {
            val note = repository.createNote(collectionId, title, content)
            _activeNote.value = note
        }
    }

    fun updateNote(title: String, content: String) {
        val note = _activeNote.value ?: return
        val updated = note.copy(title = title, content = content)
        _activeNote.value = updated
        viewModelScope.launch {
            repository.updateNote(updated)
        }
    }

    fun deleteNote(noteId: String) {
        viewModelScope.launch {
            repository.deleteNote(noteId)
            if (_activeNote.value?.id == noteId) {
                _activeNote.value = null
            }
        }
    }

    fun addPlannerItem(
        title: String,
        type: String,
        recurrence: String,
        specificDate: String,
        notifyTime: String
    ) {
        viewModelScope.launch {
            repository.addPlannerItem(title, type, recurrence, specificDate, notifyTime)
        }
    }

    fun togglePlannerItem(id: String, completed: Boolean) {
        viewModelScope.launch {
            repository.togglePlannerItem(id, completed)
        }
    }

    fun deletePlannerItem(item: PlannerItemEntity) {
        viewModelScope.launch {
            repository.deletePlannerItem(item)
        }
    }

    fun updatePerformanceMode(mode: String) {
        _engineSettings.value = _engineSettings.value.copy(performance = mode)
    }

    fun toggleTheme() {
        val nextTheme = if (_engineSettings.value.theme == "dark") "light" else "dark"
        _engineSettings.value = _engineSettings.value.copy(theme = nextTheme)
    }

    fun updateEngineSettings(settings: EngineSettings) {
        _engineSettings.value = settings
    }
}
