/**
 * Data Sync Module - Synchronizes user data between localStorage and database
 * Ensures seamless multi-device experience
 */

import { supabase } from '@/lib/supabase';
import type { Task, TaskTemplate, Topic, GamificationState, ChatMessage } from '@/types';

// ──────────── TASKS SYNC ────────────
export async function loadTasksFromDB(userId: string): Promise<Task[]> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('order_index', { ascending: true });
    
    if (error) throw error;
    
    return (data || []).map(row => ({
      id: row.id,
      title: row.title,
      status: row.status,
      quadrant: row.quadrant,
      createdAt: row.created_at,
      deadline: row.deadline,
      deadlineDate: row.deadline_date,
      deadlineTime: row.deadline_time,
      order: row.order_index,
      duration: row.duration || 0,
      completedAt: row.completed_at,
      recurring: row.recurring || { type: 'none' },
      recurringLabel: row.recurring_label,
      finance: row.finance,
      templateId: row.template_id,
      isGroup: row.is_group || false,
      groupTemplateIds: row.group_template_ids,
      showDeadline: row.show_deadline || false,
      showRecurring: row.show_recurring || false,
      showFinance: row.show_finance || false,
      showNotes: row.show_notes || false,
      notes: row.notes,
      category: row.category,
    }));
  } catch (err) {
    console.error('Error loading tasks from DB:', err);
    return [];
  }
}

export async function saveTasksToDB(userId: string, tasks: Task[]): Promise<void> {
  try {
    // Delete all existing tasks for user
    await supabase.from('tasks').delete().eq('user_id', userId);
    
    // Insert all tasks
    if (tasks.length > 0) {
      const rows = tasks.map(task => ({
        id: task.id,
        user_id: userId,
        title: task.title,
        status: task.status,
        quadrant: task.quadrant,
        created_at: task.createdAt,
        deadline: task.deadline,
        deadline_date: task.deadlineDate,
        deadline_time: task.deadlineTime,
        order_index: task.order,
        duration: task.duration || 0,
        completed_at: task.completedAt,
        recurring: task.recurring || { type: 'none' },
        recurring_label: task.recurringLabel,
        finance: task.finance,
        template_id: task.templateId,
        is_group: task.isGroup || false,
        group_template_ids: task.groupTemplateIds,
        show_deadline: task.showDeadline || false,
        show_recurring: task.showRecurring || false,
        show_finance: task.showFinance || false,
        show_notes: task.showNotes || false,
        notes: task.notes,
        category: task.category,
        updated_at: Date.now(),
      }));
      
      const { error } = await supabase.from('tasks').insert(rows);
      if (error) throw error;
    }
  } catch (err) {
    console.error('Error saving tasks to DB:', err);
  }
}

// ──────────── TEMPLATES SYNC ────────────
export async function loadTemplatesFromDB(userId: string): Promise<TaskTemplate[]> {
  try {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(row => ({
      id: row.id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      recurring: row.recurring || { type: 'none' },
      notes: row.notes,
      media: row.media,
      finance: row.finance,
      xpReward: row.xp_reward,
      topicId: row.topic_id,
      isGroup: row.is_group || false,
      groupIds: row.group_ids,
      richContent: row.rich_content,
    }));
  } catch (err) {
    console.error('Error loading templates from DB:', err);
    return [];
  }
}

export async function saveTemplatesToDB(userId: string, templates: TaskTemplate[]): Promise<void> {
  try {
    await supabase.from('templates').delete().eq('user_id', userId);
    
    if (templates.length > 0) {
      const rows = templates.map(t => ({
        id: t.id,
        user_id: userId,
        title: t.title,
        created_at: t.createdAt,
        updated_at: t.updatedAt,
        recurring: t.recurring || { type: 'none' },
        notes: t.notes,
        media: t.media,
        finance: t.finance,
        xp_reward: t.xpReward,
        topic_id: t.topicId,
        is_group: t.isGroup || false,
        group_ids: t.groupIds,
        rich_content: t.richContent,
      }));
      
      const { error } = await supabase.from('templates').insert(rows);
      if (error) throw error;
    }
  } catch (err) {
    console.error('Error saving templates to DB:', err);
  }
}

// ──────────── TOPICS SYNC ────────────
export async function loadTopicsFromDB(userId: string): Promise<Topic[]> {
  try {
    const { data, error } = await supabase
      .from('topics')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    
    return (data || []).map(row => ({
      id: row.id,
      name: row.name,
      params: row.params || [],
    }));
  } catch (err) {
    console.error('Error loading topics from DB:', err);
    return [];
  }
}

export async function saveTopicsToDB(userId: string, topics: Topic[]): Promise<void> {
  try {
    await supabase.from('topics').delete().eq('user_id', userId);
    
    if (topics.length > 0) {
      const rows = topics.map(t => ({
        id: t.id,
        user_id: userId,
        name: t.name,
        params: t.params || [],
      }));
      
      const { error } = await supabase.from('topics').insert(rows);
      if (error) throw error;
    }
  } catch (err) {
    console.error('Error saving topics to DB:', err);
  }
}

// ──────────── GAMIFICATION SYNC ────────────
export async function loadGamificationFromDB(userId: string): Promise<GamificationState | null> {
  try {
    const { data, error } = await supabase
      .from('gamification_state')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    if (!data) return null;
    
    return {
      xp: data.xp,
      level: data.level,
      streak: data.streak,
      lastActiveDate: data.last_active_date,
      totalTasksCompleted: data.total_tasks_completed,
      totalTimerSeconds: data.total_timer_seconds,
      activeDays: data.active_days,
      earlyBirdCount: data.early_bird_count,
      achievements: data.achievements || [],
      rewards: data.rewards || [],
    };
  } catch (err) {
    console.error('Error loading gamification from DB:', err);
    return null;
  }
}

export async function saveGamificationToDB(userId: string, state: GamificationState): Promise<void> {
  try {
    const { error } = await supabase.from('gamification_state').upsert({
      user_id: userId,
      xp: state.xp,
      level: state.level,
      streak: state.streak,
      last_active_date: state.lastActiveDate,
      total_tasks_completed: state.totalTasksCompleted,
      total_timer_seconds: state.totalTimerSeconds,
      active_days: state.activeDays,
      early_bird_count: state.earlyBirdCount,
      achievements: state.achievements,
      rewards: state.rewards,
      updated_at: new Date().toISOString(),
    });
    
    if (error) throw error;
  } catch (err) {
    console.error('Error saving gamification to DB:', err);
  }
}

// ──────────── CHAT MESSAGES SYNC ────────────
export async function loadChatMessagesFromDB(userId: string): Promise<ChatMessage[]> {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: true })
      .limit(100);
    
    if (error) throw error;
    
    return (data || []).map(row => ({
      id: row.id,
      role: row.role as 'user' | 'assistant',
      content: row.content,
      timestamp: row.timestamp,
    }));
  } catch (err) {
    console.error('Error loading chat messages from DB:', err);
    return [];
  }
}

export async function saveChatMessagesToDB(userId: string, messages: ChatMessage[]): Promise<void> {
  try {
    await supabase.from('chat_messages').delete().eq('user_id', userId);
    
    if (messages.length > 0) {
      const rows = messages.slice(-100).map(m => ({
        id: m.id,
        user_id: userId,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      }));
      
      const { error } = await supabase.from('chat_messages').insert(rows);
      if (error) throw error;
    }
  } catch (err) {
    console.error('Error saving chat messages to DB:', err);
  }
}

// ──────────── MIGRATION HELPER ────────────
/**
 * Migrate localStorage data to database for existing users
 */
export async function migrateLocalStorageToDatabase(userId: string): Promise<void> {
  try {
    // Check if already migrated
    const migrationKey = `nw_migrated_${userId}`;
    if (localStorage.getItem(migrationKey) === 'true') return;
    
    // Load from localStorage
    const tasksKey = userId === 'admin' ? 'nw_tasks' : `nw_tasks_${userId}`;
    const templatesKey = userId === 'admin' ? 'nw_templates' : `nw_templates_${userId}`;
    const topicsKey = userId === 'admin' ? 'nw_topics' : `nw_topics_${userId}`;
    const gamKey = userId === 'admin' ? 'nw_gamification' : `nw_gamification_${userId}`;
    const chatKey = userId === 'admin' ? 'nw_chat' : `nw_chat_${userId}`;
    
    const tasks = localStorage.getItem(tasksKey);
    const templates = localStorage.getItem(templatesKey);
    const topics = localStorage.getItem(topicsKey);
    const gam = localStorage.getItem(gamKey);
    const chat = localStorage.getItem(chatKey);
    
    // Migrate if data exists
    if (tasks) await saveTasksToDB(userId, JSON.parse(tasks));
    if (templates) await saveTemplatesToDB(userId, JSON.parse(templates));
    if (topics) await saveTopicsToDB(userId, JSON.parse(topics));
    if (gam) await saveGamificationToDB(userId, JSON.parse(gam));
    if (chat) await saveChatMessagesToDB(userId, JSON.parse(chat));
    
    // Mark as migrated
    localStorage.setItem(migrationKey, 'true');
    console.log('✅ Data migrated to database successfully');
  } catch (err) {
    console.error('❌ Error migrating localStorage to database:', err);
  }
}
