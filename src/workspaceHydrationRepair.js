import { supabase } from './lib/supabase.js';

const LOCAL_KEY = 'mobile-liquid-glass-workspace-v1';
const LOCAL_DIRTY_KEY = 'mobile-liquid-glass-local-dirty-v1';

function localStorageKey(userId) {
  return `${LOCAL_KEY}:${userId}`;
}

function dirtyKey(userId) {
  return `${LOCAL_DIRTY_KEY}:${userId}`;
}

function readLocal(userId) {
  try {
    const raw = localStorage.getItem(localStorageKey(userId));
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed?.courses) ? parsed.courses : null;
  } catch {
    return null;
  }
}

function writeLocal(userId, courses) {
  try {
    localStorage.setItem(localStorageKey(userId), JSON.stringify({ version: 4, courses }));
  } catch {}
}

function isDirty(userId) {
  try {
    return localStorage.getItem(dirtyKey(userId)) === '1';
  } catch {
    return false;
  }
}

function parseTime(value) {
  return Date.parse(value || '') || Date.now();
}

function cloudWorkspace(courses, collections, notes) {
  const collectionMap = new Map((collections || []).map((row) => [String(row.id), {
    id: row.id,
    courseId: row.course_id,
    title: row.name || 'New collection',
    description: '',
    notes: [],
    createdAt: parseTime(row.created_at),
    updatedAt: parseTime(row.updated_at),
  }]));

  const courseMap = new Map((courses || []).map((row) => [String(row.id), {
    id: row.id,
    name: row.name || 'Untitled course',
    description: row.description || '',
    color: row.color || 'sky',
    progress: 0,
    collections: [],
    createdAt: parseTime(row.created_at),
    updatedAt: parseTime(row.updated_at),
  }]));

  for (const collection of collectionMap.values()) {
    courseMap.get(String(collection.courseId))?.collections.push(collection);
  }

  for (const row of notes || []) {
    const course = courseMap.get(String(row.course_id));
    if (!course) continue;
    let collection = row.collection_id ? collectionMap.get(String(row.collection_id)) : null;
    if (!collection) {
      collection = {
        id: row.collection_id || `uncategorized-${row.course_id}`,
        courseId: row.course_id,
        title: 'Uncategorized',
        description: '',
        notes: [],
        createdAt: parseTime(row.created_at),
        updatedAt: parseTime(row.updated_at),
      };
      collectionMap.set(String(collection.id), collection);
      course.collections.push(collection);
    }
    collection.notes.push({
      id: row.id,
      title: row.title || 'Untitled note',
      content: row.body || '',
      favorite: Boolean(row.favorite),
      revision: Number(row.revision || 0),
      sourceId: row.source_id || null,
      createdAt: parseTime(row.created_at),
      updatedAt: parseTime(row.updated_at),
    });
  }

  return [...courseMap.values()].sort((a, b) => b.createdAt - a.createdAt).map((course) => ({
    ...course,
    collections: course.collections.sort((a, b) => a.createdAt - b.createdAt).map((collection) => ({
      ...collection,
      notes: collection.notes.sort((a, b) => b.updatedAt - a.updatedAt),
    })),
  }));
}

function mergeCloudIntoLocal(localCourses, cloudCourses) {
  const merged = Array.isArray(localCourses) ? structuredClone(localCourses) : [];
  const courseById = new Map(merged.map((course) => [String(course.id), course]));
  const courseByName = new Map(merged.map((course) => [String(course.name || '').trim().toLowerCase(), course]));

  for (const cloudCourse of cloudCourses) {
    let course = courseById.get(String(cloudCourse.id)) || courseByName.get(String(cloudCourse.name || '').trim().toLowerCase());
    if (!course) {
      merged.push(structuredClone(cloudCourse));
      course = merged[merged.length - 1];
      courseById.set(String(course.id), course);
      courseByName.set(String(course.name || '').trim().toLowerCase(), course);
      continue;
    }

    if (!Array.isArray(course.collections)) course.collections = [];
    const collectionById = new Map(course.collections.map((collection) => [String(collection.id), collection]));
    const collectionByTitle = new Map(course.collections.map((collection) => [String(collection.title || '').trim().toLowerCase(), collection]));

    for (const cloudCollection of cloudCourse.collections || []) {
      let collection = collectionById.get(String(cloudCollection.id)) || collectionByTitle.get(String(cloudCollection.title || '').trim().toLowerCase());
      if (!collection) {
        course.collections.push(structuredClone(cloudCollection));
        collection = course.collections[course.collections.length - 1];
        collectionById.set(String(collection.id), collection);
        collectionByTitle.set(String(collection.title || '').trim().toLowerCase(), collection);
      }

      if (!Array.isArray(collection.notes)) collection.notes = [];
      const noteById = new Map(collection.notes.map((note) => [String(note.id), note]));
      const noteByTitle = new Map(collection.notes.map((note) => [String(note.title || '').trim().toLowerCase(), note]));
      for (const cloudNote of cloudCollection.notes || []) {
        if (noteById.has(String(cloudNote.id)) || noteByTitle.has(String(cloudNote.title || '').trim().toLowerCase())) continue;
        collection.notes.push(structuredClone(cloudNote));
      }
    }
  }

  return merged;
}

export async function repairWorkspaceBeforeHydration(userId) {
  if (!supabase || !userId || userId === 'anonymous' || !isDirty(userId)) return;
  const local = readLocal(userId);
  if (!Array.isArray(local)) return;

  const [coursesResult, collectionsResult, notesResult] = await Promise.all([
    supabase.from('courses').select('id,name,description,color,created_at,updated_at').eq('user_id', userId),
    supabase.from('collections').select('id,course_id,name,created_at,updated_at').eq('user_id', userId),
    supabase.from('notes').select('id,course_id,collection_id,title,body,favorite,revision,source_id,created_at,updated_at').eq('user_id', userId),
  ]);

  if (coursesResult.error || collectionsResult.error || notesResult.error) return;
  if (!coursesResult.data?.length && !collectionsResult.data?.length && !notesResult.data?.length) return;

  const cloud = cloudWorkspace(coursesResult.data, collectionsResult.data, notesResult.data);
  const merged = mergeCloudIntoLocal(local, cloud);
  writeLocal(userId, merged);
}
