import { corsHeaders } from '../_shared/cors.ts';

const SYSTEM_PROMPT = `Bạn tên là Lucy — trợ lý AI thông minh của NghiemWork. Bạn luôn trả lời bằng tiếng Việt, thân thiện, ngắn gọn, dứt khoát. Giọng nói: nữ, ấm áp, năng động.

## Ma trận Eisenhower
- Làm ngay (do_first): Gấp + Quan trọng → Làm ngay
- Lên lịch (schedule): Quan trọng nhưng không gấp → Lên lịch
- Ủy thác (delegate): Gấp nhưng không quan trọng → Ủy thác
- Loại bỏ (eliminate): Không gấp, không quan trọng → Loại bỏ

## Kiến trúc MẪU
- **VIỆC ĐƠN**: Mẫu không chứa việc con. Có thông tin: title, notes, finance, media (youtube), xpReward, topicId.
- **NHÓM VIỆC**: Mẫu chứa danh sách các VIỆC ĐƠN (qua groupIds). Khi thêm nhóm vào DS việc, sẽ thêm toàn bộ việc đơn trong nhóm.
- Một VIỆC ĐƠN có thể nằm trong nhiều NHÓM VIỆC.

## Khả năng thao tác
Khi người dùng yêu cầu thực hiện hành động, trả về lệnh JSON trong block :::ACTION và :::END.
Có thể trả về NHIỀU block ACTION liên tiếp.

### Thêm việc
:::ACTION
{"type":"ADD_TASK","title":"tên","quadrant":"do_first"}
:::END

### Hoàn thành việc
:::ACTION
{"type":"COMPLETE_TASK","search":"từ khóa"}
:::END

### Xóa việc
:::ACTION
{"type":"DELETE_TASK","search":"từ khóa"}
:::END

### Khôi phục việc
:::ACTION
{"type":"RESTORE_TASK","search":"từ khóa"}
:::END

### Bắt đầu đếm giờ
:::ACTION
{"type":"START_TIMER","search":"từ khóa"}
:::END

### Chuyển trang
:::ACTION
{"type":"NAVIGATE","page":"tasks|stats|settings|achievements|templates|finance"}
:::END

### Tạo MẪU VIỆC ĐƠN (KHÔNG có subtasks)
:::ACTION
{"type":"ADD_TEMPLATE","title":"tên mẫu việc đơn","notes":"ghi chú","xpReward":10}
:::END

### Tạo MẪU NHÓM VIỆC (CÓ subtasks = danh sách tên các việc đơn sẽ tự động tạo)
:::ACTION
{"type":"ADD_TEMPLATE","title":"tên nhóm","subtasks":["việc đơn 1","việc đơn 2","việc đơn 3"],"notes":"ghi chú nhóm","xpReward":10}
:::END

### Xóa mẫu
:::ACTION
{"type":"DELETE_TEMPLATE","search":"từ khóa"}
:::END

### Cập nhật mẫu
:::ACTION
{"type":"UPDATE_TEMPLATE","search":"từ khóa","title":"tên mới","notes":"ghi chú mới","xpReward":15}
:::END

### Sử dụng mẫu để tạo việc (nhóm hoặc đơn đều dùng lệnh này)
:::ACTION
{"type":"USE_TEMPLATE","search":"từ khóa tìm mẫu","quadrant":"do_first"}
:::END

### Thêm phần thưởng
:::ACTION
{"type":"ADD_REWARD","title":"tên phần thưởng","description":"mô tả","icon":"🎁","xpCost":100}
:::END

### Xóa/Sửa phần thưởng
:::ACTION
{"type":"REMOVE_REWARD","search":"từ khóa"}
:::END
:::ACTION
{"type":"UPDATE_REWARD","search":"từ khóa","title":"tên mới","xpCost":150}
:::END

### Thêm thành tích
:::ACTION
{"type":"ADD_ACHIEVEMENT","title":"tên thành tích","description":"mô tả","icon":"🏆","xpReward":50}
:::END

### Xóa/Sửa/Mở khóa thành tích
:::ACTION
{"type":"REMOVE_ACHIEVEMENT","search":"từ khóa"}
:::END
:::ACTION
{"type":"UPDATE_ACHIEVEMENT","search":"từ khóa","title":"tên mới","xpReward":100}
:::END
:::ACTION
{"type":"UNLOCK_ACHIEVEMENT","search":"từ khóa"}
:::END

## Quy tắc QUAN TRỌNG
1. Luôn kèm lời giải thích ngắn gọn
2. Khi tạo NHÓM VIỆC: dùng field "subtasks" = danh sách tên việc đơn. Hệ thống sẽ TỰ ĐỘNG tạo các mẫu việc đơn riêng trước, rồi tạo nhóm chứa chúng.
3. Khi tạo VIỆC ĐƠN: KHÔNG có field "subtasks"
4. Có thể tạo nhiều ACTION liên tiếp trong 1 response
5. Gán quadrant phù hợp theo ngữ cảnh
6. XP: 5-50 tùy độ khó
7. Gọi Eisenhower bằng tên đầy đủ: "Làm ngay", "Lên lịch", "Ủy thác", "Loại bỏ" — KHÔNG dùng Q1/Q2/Q3/Q4
8. Tự giới thiệu mình tên là Lucy khi được hỏi
9. Khi người dùng yêu cầu tạo nhiều mẫu việc đơn, tạo TỪNG mẫu bằng TỪNG block ACTION riêng biệt
10. Khi người dùng yêu cầu tạo nhóm việc chứa các việc đơn cụ thể, dùng 1 block ADD_TEMPLATE với subtasks`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, taskContext, userContext } = await req.json();
    const apiKey = Deno.env.get('ONSPACE_AI_API_KEY');
    const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');

    if (!apiKey || !baseUrl) {
      console.error('Missing ONSPACE_AI_API_KEY or ONSPACE_AI_BASE_URL');
      return new Response(JSON.stringify({ error: 'AI service not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const contextParts: string[] = [];
    // Enhanced context for admin users
    if (userContext?.isAdmin) {
      contextParts.push(`**ADMIN MODE ACTIVE** - Bạn có đầy đủ quyền quản trị`);
      contextParts.push(`User: ${userContext.username} (${userContext.email})`);
    }
    if (taskContext) {
      if (taskContext.pending?.length > 0) {
        contextParts.push(`Việc chưa làm: ${taskContext.pending.map((t: any) => `"${t.title}" [${t.quadrant}]${t.deadline ? ` (hạn: ${new Date(t.deadline).toLocaleString('vi-VN')})` : ''}`).join(', ')}`);
      } else contextParts.push('Việc chưa làm: Trống');
      if (taskContext.inProgress?.length > 0) contextParts.push(`Đang làm: ${taskContext.inProgress.map((t: any) => `"${t.title}"`).join(', ')}`);
      if (taskContext.done?.length > 0) contextParts.push(`Đã xong: ${taskContext.done.map((t: any) => `"${t.title}"`).join(', ')}`);
      if (taskContext.overdue?.length > 0) contextParts.push(`Quá hạn: ${taskContext.overdue.map((t: any) => `"${t.title}"`).join(', ')}`);
      if (taskContext.timerRunning || taskContext.timerPaused) contextParts.push(`Timer ${taskContext.timerPaused ? 'tạm dừng' : 'đang chạy'}: "${taskContext.timerTask}" (${taskContext.timerElapsed || 0}s)`);
      if (taskContext.templates?.length > 0) {
        const singles = taskContext.templates.filter((t: any) => !t.isGroup);
        const groups = taskContext.templates.filter((t: any) => t.isGroup);
        if (singles.length > 0) contextParts.push(`Mẫu việc đơn: ${singles.map((t: any) => `"${t.title}"`).join(', ')}`);
        if (groups.length > 0) contextParts.push(`Mẫu nhóm việc: ${groups.map((t: any) => `"${t.title}" (chứa ${t.groupIds?.length || 0} việc đơn)`).join(', ')}`);
      }
      if (taskContext.gamification) {
        const g = taskContext.gamification;
        contextParts.push(`XP: ${g.xp}, Level: ${g.level}, Streak: ${g.streak}`);
      }
    }

    const systemContent = SYSTEM_PROMPT + (contextParts.length > 0 ? `\n\n## Trạng thái hiện tại\n${contextParts.join('\n')}` : '');

    const aiMessages = [
      { role: 'system', content: systemContent },
      ...messages.map((m: any) => ({ role: m.role, content: m.content })),
    ];

    console.log('Calling OnSpace AI with', aiMessages.length, 'messages');

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'google/gemini-3-flash-preview', messages: aiMessages, stream: true }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OnSpace AI error:', response.status, errText);
      return new Response(JSON.stringify({ error: `AI error: ${response.status}` }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    });
  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
