import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface ChatConversation {
  id: string;
  organization_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  assigned_to: string | null;
  warranty_id: string | null;
  claim_id: string | null;
  status: 'active' | 'resolved' | 'archived';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  last_message_at: string;
  unread_count_customer: number;
  unread_count_staff: number;
  access_token: string;
  tags: string[];
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_type: 'customer' | 'staff' | 'system';
  sender_id: string | null;
  sender_name: string;
  message_type: 'text' | 'file' | 'image' | 'status_update' | 'system';
  content: string;
  attachments: any[];
  read_by_customer: boolean;
  read_by_staff: boolean;
  read_at: string | null;
  is_internal: boolean;
  created_at: string;
}

export interface ClaimStatusUpdate {
  id: string;
  organization_id: string;
  claim_id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  changed_by_name: string;
  reason: string | null;
  notes: string | null;
  notification_sent: boolean;
  notification_sent_at: string | null;
  metadata: any;
  created_at: string;
}

export interface TypingIndicator {
  conversation_id: string;
  user_type: 'customer' | 'staff';
  user_id: string | null;
  user_name: string;
  expires_at: string;
}

export interface PushSubscription {
  id: string;
  organization_id: string;
  user_id: string;
  push_token: string;
  platform: 'web' | 'ios' | 'android';
  endpoint: string | null;
  keys: any;
  enabled: boolean;
  preferences: {
    new_messages: boolean;
    claim_updates: boolean;
    warranty_expiring: boolean;
    system_alerts: boolean;
  };
  user_agent: string | null;
  last_used_at: string;
  created_at: string;
}

// =====================================================
// CONVERSATIONS
// =====================================================

export async function createConversation(data: {
  organization_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  warranty_id?: string;
  claim_id?: string;
  assigned_to?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}): Promise<ChatConversation> {
  const { data: conversation, error } = await supabase
    .from('chat_conversations')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return conversation;
}

export async function getConversations(organizationId: string): Promise<ChatConversation[]> {
  const { data, error } = await supabase
    .from('chat_conversations')
    .select('*')
    .eq('organization_id', organizationId)
    .order('last_message_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getConversation(conversationId: string): Promise<ChatConversation> {
  const { data, error } = await supabase
    .from('chat_conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateConversation(
  conversationId: string,
  updates: Partial<ChatConversation>
): Promise<void> {
  const { error } = await supabase
    .from('chat_conversations')
    .update(updates)
    .eq('id', conversationId);

  if (error) throw error;
}

export async function markConversationAsRead(
  conversationId: string,
  userType: 'customer' | 'staff'
): Promise<void> {
  const field = userType === 'customer' ? 'unread_count_customer' : 'unread_count_staff';

  const { error } = await supabase
    .from('chat_conversations')
    .update({ [field]: 0 })
    .eq('id', conversationId);

  if (error) throw error;
}

// =====================================================
// MESSAGES
// =====================================================

export async function sendMessage(data: {
  conversation_id: string;
  sender_type: 'customer' | 'staff' | 'system';
  sender_id?: string;
  sender_name: string;
  message_type?: 'text' | 'file' | 'image' | 'status_update' | 'system';
  content: string;
  attachments?: any[];
  is_internal?: boolean;
}): Promise<ChatMessage> {
  const { data: message, error } = await supabase
    .from('chat_messages')
    .insert({
      message_type: 'text',
      attachments: [],
      is_internal: false,
      ...data,
    })
    .select()
    .single();

  if (error) throw error;
  return message;
}

export async function getMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function markMessagesAsRead(
  conversationId: string,
  userType: 'customer' | 'staff'
): Promise<void> {
  const field = userType === 'customer' ? 'read_by_customer' : 'read_by_staff';

  const { error } = await supabase
    .from('chat_messages')
    .update({
      [field]: true,
      read_at: new Date().toISOString()
    })
    .eq('conversation_id', conversationId)
    .eq(field, false);

  if (error) throw error;
}

// =====================================================
// CLAIM STATUS UPDATES
// =====================================================

export async function createClaimStatusUpdate(data: {
  organization_id: string;
  claim_id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string;
  changed_by_name: string;
  reason?: string;
  notes?: string;
}): Promise<ClaimStatusUpdate> {
  const { data: update, error } = await supabase
    .from('claim_status_updates')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return update;
}

export async function getClaimStatusUpdates(claimId: string): Promise<ClaimStatusUpdate[]> {
  const { data, error } = await supabase
    .from('claim_status_updates')
    .select('*')
    .eq('claim_id', claimId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// =====================================================
// TYPING INDICATORS
// =====================================================

export async function setTypingIndicator(
  conversationId: string,
  userType: 'customer' | 'staff',
  userId: string | null,
  userName: string
): Promise<void> {
  const { error } = await supabase
    .from('typing_indicators')
    .upsert({
      conversation_id: conversationId,
      user_type: userType,
      user_id: userId,
      user_name: userName,
      expires_at: new Date(Date.now() + 10000).toISOString()
    });

  if (error) throw error;
}

export async function clearTypingIndicator(
  conversationId: string,
  userType: 'customer' | 'staff',
  userId: string | null
): Promise<void> {
  const { error } = await supabase
    .from('typing_indicators')
    .delete()
    .eq('conversation_id', conversationId)
    .eq('user_type', userType)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function getTypingIndicators(conversationId: string): Promise<TypingIndicator[]> {
  const { data, error } = await supabase
    .from('typing_indicators')
    .select('*')
    .eq('conversation_id', conversationId)
    .gt('expires_at', new Date().toISOString());

  if (error) throw error;
  return data || [];
}

// =====================================================
// REALTIME SUBSCRIPTIONS
// =====================================================

export function subscribeToConversation(
  conversationId: string,
  callbacks: {
    onMessage?: (message: ChatMessage) => void;
    onTyping?: (indicator: TypingIndicator) => void;
    onConversationUpdate?: (conversation: ChatConversation) => void;
  }
): RealtimeChannel {
  const channel = supabase.channel(`conversation:${conversationId}`);

  if (callbacks.onMessage) {
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload) => callbacks.onMessage!(payload.new as ChatMessage)
    );
  }

  if (callbacks.onTyping) {
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'typing_indicators',
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          callbacks.onTyping!({ ...payload.old, expires_at: new Date(0).toISOString() } as TypingIndicator);
        } else {
          callbacks.onTyping!(payload.new as TypingIndicator);
        }
      }
    );
  }

  if (callbacks.onConversationUpdate) {
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_conversations',
        filter: `id=eq.${conversationId}`
      },
      (payload) => callbacks.onConversationUpdate!(payload.new as ChatConversation)
    );
  }

  channel.subscribe();
  return channel;
}

export function subscribeToConversations(
  organizationId: string,
  onUpdate: (conversation: ChatConversation) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`conversations:${organizationId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'chat_conversations',
        filter: `organization_id=eq.${organizationId}`
      },
      (payload) => {
        if (payload.eventType === 'DELETE') return;
        onUpdate(payload.new as ChatConversation);
      }
    )
    .subscribe();

  return channel;
}

export function subscribeToClaimUpdates(
  claimId: string,
  onUpdate: (update: ClaimStatusUpdate) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`claim:${claimId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'claim_status_updates',
        filter: `claim_id=eq.${claimId}`
      },
      (payload) => onUpdate(payload.new as ClaimStatusUpdate)
    )
    .subscribe();

  return channel;
}

// =====================================================
// PUSH NOTIFICATIONS
// =====================================================

export async function registerPushSubscription(data: {
  organization_id: string;
  user_id: string;
  push_token: string;
  platform: 'web' | 'ios' | 'android';
  endpoint?: string;
  keys?: any;
  preferences?: Partial<PushSubscription['preferences']>;
}): Promise<PushSubscription> {
  const { data: subscription, error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        ...data,
        enabled: true,
        preferences: {
          new_messages: true,
          claim_updates: true,
          warranty_expiring: true,
          system_alerts: true,
          ...data.preferences,
        },
        user_agent: navigator.userAgent,
        last_used_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,push_token',
        ignoreDuplicates: false,
      }
    )
    .select()
    .single();

  if (error) throw error;
  return subscription;
}

export async function updatePushPreferences(
  subscriptionId: string,
  preferences: Partial<PushSubscription['preferences']>
): Promise<void> {
  const { error } = await supabase
    .from('push_subscriptions')
    .update({ preferences })
    .eq('id', subscriptionId);

  if (error) throw error;
}

export async function disablePushSubscription(subscriptionId: string): Promise<void> {
  const { error } = await supabase
    .from('push_subscriptions')
    .update({ enabled: false })
    .eq('id', subscriptionId);

  if (error) throw error;
}
