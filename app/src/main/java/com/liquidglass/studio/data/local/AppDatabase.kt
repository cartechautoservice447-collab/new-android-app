package com.liquidglass.studio.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.sqlite.db.SupportSQLiteDatabase
import com.liquidglass.studio.data.model.CollectionEntity
import com.liquidglass.studio.data.model.CourseEntity
import com.liquidglass.studio.data.model.NoteEntity
import com.liquidglass.studio.data.model.PlannerItemEntity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

@Database(
    entities = [
        CourseEntity::class,
        CollectionEntity::class,
        NoteEntity::class,
        PlannerItemEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun courseDao(): CourseDao
    abstract fun collectionDao(): CollectionDao
    abstract fun noteDao(): NoteDao
    abstract fun plannerDao(): PlannerDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context, scope: CoroutineScope): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "liquid_glass_studio.db"
                )
                    .addCallback(DatabaseCallback(scope))
                    .build()
                INSTANCE = instance
                instance
            }
        }

        private class DatabaseCallback(
            private val scope: CoroutineScope
        ) : RoomDatabase.Callback() {
            override fun onCreate(db: SupportSQLiteDatabase) {
                super.onCreate(db)
                INSTANCE?.let { database ->
                    scope.launch(Dispatchers.IO) {
                        populateInitialData(database)
                    }
                }
            }

            private suspend fun populateInitialData(database: AppDatabase) {
                val courseDao = database.courseDao()
                val collectionDao = database.collectionDao()
                val noteDao = database.noteDao()
                val plannerDao = database.plannerDao()

                val defaultCourse = CourseEntity(
                    id = "default-course",
                    name = "My First Course",
                    description = "Start learning with Liquid Glass Studio",
                    color = "sky",
                    progress = 35
                )
                courseDao.insertCourse(defaultCourse)

                val col1 = CollectionEntity(
                    id = "collection-1",
                    courseId = defaultCourse.id,
                    title = "Getting Started",
                    description = "Your first collection for organizing study notes."
                )
                val col2 = CollectionEntity(
                    id = "collection-2",
                    courseId = defaultCourse.id,
                    title = "Quick Thoughts",
                    description = "Keep important thoughts close while you study."
                )
                collectionDao.insertCollection(col1)
                collectionDao.insertCollection(col2)

                val note1 = NoteEntity(
                    id = "note-1",
                    collectionId = col1.id,
                    title = "Welcome to your notes",
                    content = """
# Welcome to Liquid Glass Studio

Liquid Glass Studio is a mobile-first study workspace designed with fluid glassmorphism and focus-driven tools.

> [!TIP]
> Use the formatting toolbar below to insert headers, code blocks, lists, and callout banners.

### Core Features
- [x] Create courses with custom color accents
- [x] Organize notes into collections
- [ ] Try the Pomodoro Focus Session timer
- [ ] Schedule tasks in the Daily Planner

```python
def study_session(topic: str, minutes: int):
    print(f"Focused on {topic} for {minutes} minutes.")
```
                    """.trimIndent()
                )
                val note2 = NoteEntity(
                    id = "note-2",
                    collectionId = col1.id,
                    title = "Getting started",
                    content = "Your first note is ready. Open it when you want to begin capturing your study material."
                )
                val note3 = NoteEntity(
                    id = "note-3",
                    collectionId = col2.id,
                    title = "Quick thoughts",
                    content = "Keep important formulas, key quotes, and instant thoughts close while you study."
                )
                noteDao.insertNote(note1)
                noteDao.insertNote(note2)
                noteDao.insertNote(note3)

                val item1 = PlannerItemEntity(
                    id = "planner-1",
                    title = "Review CS50 Lecture 3 Notes",
                    type = "reminder",
                    recurrence = "daily",
                    notifyTime = "09:00",
                    isCompleted = false
                )
                val item2 = PlannerItemEntity(
                    id = "planner-2",
                    title = "Algorithms & Data Structures Exam",
                    type = "exam",
                    recurrence = "specific",
                    specificDate = "2026-09-20",
                    notifyTime = "14:00",
                    isCompleted = false
                )
                plannerDao.insertPlannerItem(item1)
                plannerDao.insertPlannerItem(item2)
            }
        }
    }
}
