package com.liquidglass.studio.data.model

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(tableName = "courses")
data class CourseEntity(
    @PrimaryKey
    val id: String,
    val name: String,
    val description: String,
    val color: String = "sky",
    val progress: Int = 0,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)

@Entity(
    tableName = "collections",
    foreignKeys = [
        ForeignKey(
            entity = CourseEntity::class,
            parentColumns = ["id"],
            childColumns = ["courseId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index(value = ["courseId"])]
)
data class CollectionEntity(
    @PrimaryKey
    val id: String,
    val courseId: String,
    val title: String,
    val description: String = "",
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)

@Entity(
    tableName = "notes",
    foreignKeys = [
        ForeignKey(
            entity = CollectionEntity::class,
            parentColumns = ["id"],
            childColumns = ["collectionId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index(value = ["collectionId"])]
)
data class NoteEntity(
    @PrimaryKey
    val id: String,
    val collectionId: String,
    val title: String,
    val content: String = "",
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "planner_items")
data class PlannerItemEntity(
    @PrimaryKey
    val id: String,
    val title: String,
    val type: String = "reminder", // reminder, exam, project, deadline
    val recurrence: String = "daily", // none, daily, weekdays, specific
    val specificDate: String = "",
    val notifyTime: String = "09:00",
    val leadTimeMinutes: Int = 0,
    val isCompleted: Boolean = false,
    val createdAt: Long = System.currentTimeMillis()
)

data class CourseWithStats(
    val course: CourseEntity,
    val collectionCount: Int,
    val noteCount: Int
)

data class CollectionWithNotes(
    val collection: CollectionEntity,
    val notes: List<NoteEntity>
)

data class EngineSettings(
    val performance: String = "ultra", // high, ultra
    val theme: String = "dark", // dark, light
    val liquidDensity: Float = 14f,
    val liquidTransparency: Float = 0.45f,
    val liquidGel: Float = 0.65f,
    val liquidClearness: Float = 0.40f,
    val displayName: String = "Scholar"
)
