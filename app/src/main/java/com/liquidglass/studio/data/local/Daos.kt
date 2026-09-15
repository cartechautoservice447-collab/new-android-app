package com.liquidglass.studio.data.local

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.liquidglass.studio.data.model.CollectionEntity
import com.liquidglass.studio.data.model.CourseEntity
import com.liquidglass.studio.data.model.NoteEntity
import com.liquidglass.studio.data.model.PlannerItemEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface CourseDao {
    @Query("SELECT * FROM courses ORDER BY updatedAt DESC")
    fun getAllCourses(): Flow<List<CourseEntity>>

    @Query("SELECT * FROM courses WHERE id = :courseId")
    suspend fun getCourseById(courseId: String): CourseEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCourse(course: CourseEntity)

    @Update
    suspend fun updateCourse(course: CourseEntity)

    @Delete
    suspend fun deleteCourse(course: CourseEntity)

    @Query("DELETE FROM courses WHERE id = :courseId")
    suspend fun deleteCourseById(courseId: String)
}

@Dao
interface CollectionDao {
    @Query("SELECT * FROM collections WHERE courseId = :courseId ORDER BY createdAt ASC")
    fun getCollectionsForCourse(courseId: String): Flow<List<CollectionEntity>>

    @Query("SELECT * FROM collections WHERE courseId = :courseId")
    suspend fun getCollectionsListForCourse(courseId: String): List<CollectionEntity>

    @Query("SELECT * FROM collections WHERE id = :collectionId")
    suspend fun getCollectionById(collectionId: String): CollectionEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCollection(collection: CollectionEntity)

    @Delete
    suspend fun deleteCollection(collection: CollectionEntity)

    @Query("SELECT COUNT(*) FROM collections WHERE courseId = :courseId")
    suspend fun getCollectionCount(courseId: String): Int
}

@Dao
interface NoteDao {
    @Query("SELECT * FROM notes WHERE collectionId = :collectionId ORDER BY updatedAt DESC")
    fun getNotesForCollection(collectionId: String): Flow<List<NoteEntity>>

    @Query("SELECT notes.* FROM notes INNER JOIN collections ON notes.collectionId = collections.id WHERE collections.courseId = :courseId ORDER BY notes.updatedAt DESC")
    fun getAllNotesForCourse(courseId: String): Flow<List<NoteEntity>>

    @Query("SELECT * FROM notes WHERE id = :noteId")
    suspend fun getNoteById(noteId: String): NoteEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertNote(note: NoteEntity)

    @Update
    suspend fun updateNote(note: NoteEntity)

    @Delete
    suspend fun deleteNote(note: NoteEntity)

    @Query("DELETE FROM notes WHERE id = :noteId")
    suspend fun deleteNoteById(noteId: String)

    @Query("SELECT COUNT(*) FROM notes")
    fun getTotalNotesCount(): Flow<Int>

    @Query("SELECT COUNT(*) FROM notes INNER JOIN collections ON notes.collectionId = collections.id WHERE collections.courseId = :courseId")
    suspend fun getNotesCountForCourse(courseId: String): Int
}

@Dao
interface PlannerDao {
    @Query("SELECT * FROM planner_items ORDER BY createdAt DESC")
    fun getAllPlannerItems(): Flow<List<PlannerItemEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPlannerItem(item: PlannerItemEntity)

    @Update
    suspend fun updatePlannerItem(item: PlannerItemEntity)

    @Delete
    suspend fun deletePlannerItem(item: PlannerItemEntity)

    @Query("UPDATE planner_items SET isCompleted = :completed WHERE id = :id")
    suspend fun toggleCompleted(id: String, completed: Boolean)
}
