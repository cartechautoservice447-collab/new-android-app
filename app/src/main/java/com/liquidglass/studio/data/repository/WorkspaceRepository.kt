package com.liquidglass.studio.data.repository

import com.liquidglass.studio.data.local.CollectionDao
import com.liquidglass.studio.data.local.CourseDao
import com.liquidglass.studio.data.local.NoteDao
import com.liquidglass.studio.data.local.PlannerDao
import com.liquidglass.studio.data.model.CollectionEntity
import com.liquidglass.studio.data.model.CourseEntity
import com.liquidglass.studio.data.model.NoteEntity
import com.liquidglass.studio.data.model.PlannerItemEntity
import kotlinx.coroutines.flow.Flow

class WorkspaceRepository(
    private val courseDao: CourseDao,
    private val collectionDao: CollectionDao,
    private val noteDao: NoteDao,
    private val plannerDao: PlannerDao
) {
    val allCourses: Flow<List<CourseEntity>> = courseDao.getAllCourses()
    val totalNotesCount: Flow<Int> = noteDao.getTotalNotesCount()
    val allPlannerItems: Flow<List<PlannerItemEntity>> = plannerDao.getAllPlannerItems()

    fun getCollectionsForCourse(courseId: String): Flow<List<CollectionEntity>> =
        collectionDao.getCollectionsForCourse(courseId)

    fun getNotesForCollection(collectionId: String): Flow<List<NoteEntity>> =
        noteDao.getNotesForCollection(collectionId)

    fun getAllNotesForCourse(courseId: String): Flow<List<NoteEntity>> =
        noteDao.getAllNotesForCourse(courseId)

    suspend fun getCourse(courseId: String): CourseEntity? = courseDao.getCourseById(courseId)
    suspend fun getCollection(collectionId: String): CollectionEntity? = collectionDao.getCollectionById(collectionId)
    suspend fun getNote(noteId: String): NoteEntity? = noteDao.getNoteById(noteId)

    suspend fun createCourse(name: String, description: String, color: String): CourseEntity {
        val course = CourseEntity(
            id = "course-${System.currentTimeMillis()}",
            name = name,
            description = description,
            color = color,
            progress = 0
        )
        courseDao.insertCourse(course)
        return course
    }

    suspend fun updateCourse(course: CourseEntity) {
        courseDao.updateCourse(course)
    }

    suspend fun deleteCourse(courseId: String) {
        courseDao.deleteCourseById(courseId)
    }

    suspend fun createCollection(courseId: String, title: String, description: String = ""): CollectionEntity {
        val collection = CollectionEntity(
            id = "col-${System.currentTimeMillis()}",
            courseId = courseId,
            title = title,
            description = description
        )
        collectionDao.insertCollection(collection)
        return collection
    }

    suspend fun createNote(collectionId: String, title: String, content: String = ""): NoteEntity {
        val note = NoteEntity(
            id = "note-${System.currentTimeMillis()}",
            collectionId = collectionId,
            title = title,
            content = content
        )
        noteDao.insertNote(note)
        return note
    }

    suspend fun updateNote(note: NoteEntity) {
        noteDao.updateNote(note.copy(updatedAt = System.currentTimeMillis()))
    }

    suspend fun deleteNote(noteId: String) {
        noteDao.deleteNoteById(noteId)
    }

    suspend fun addPlannerItem(
        title: String,
        type: String,
        recurrence: String,
        specificDate: String,
        notifyTime: String
    ) {
        val item = PlannerItemEntity(
            id = "planner-${System.currentTimeMillis()}",
            title = title,
            type = type,
            recurrence = recurrence,
            specificDate = specificDate,
            notifyTime = notifyTime,
            isCompleted = false
        )
        plannerDao.insertPlannerItem(item)
    }

    suspend fun togglePlannerItem(id: String, completed: Boolean) {
        plannerDao.toggleCompleted(id, completed)
    }

    suspend fun deletePlannerItem(item: PlannerItemEntity) {
        plannerDao.deletePlannerItem(item)
    }
}
