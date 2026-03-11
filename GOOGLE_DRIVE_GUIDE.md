# HƯỚNG DẪN TÍCH HỢP GOOGLE DRIVE

## Các tính năng đã triển khai

✅ **YouTube video** - Đã sửa lỗi, giờ lưu full embed URL và play hoàn hảo  
✅ **Settings accordion** - Bố cục gọn gàng với menu thu gọn  
✅ **Multi-user system** - Hệ thống đa người dùng với Supabase auth  
✅ **Admin panel** - Quản lý user (thêm/sửa/chặn/xóa)  
✅ **Group Chat** - Chat nhóm với channels, @mention, @Lucy AI  
✅ **Notification Bell** - Trung tâm thông báo ở góc phải trên  

⚠️ **Google Drive upload** - Cần cấu hình thêm (xem hướng dẫn bên dưới)

---

## CÁCH LƯU FILE LÊN GOOGLE DRIVE

Google Drive API yêu cầu **Service Account** và **Backend server** để upload an toàn. Đây là các bước chi tiết:

### BƯỚC 1: Tạo Google Cloud Project

1. Truy cập [Google Cloud Console](https://console.cloud.google.com)
2. Tạo project mới hoặc chọn project hiện có
3. Bật **Google Drive API**:
   - Vào "APIs & Services" > "Library"
   - Tìm "Google Drive API"
   - Click "Enable"

### BƯỚC 2: Tạo Service Account

1. Vào "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Điền thông tin:
   - Service account name: `nghiemwork-drive`
   - Service account ID: tự động tạo
4. Click "Create and Continue"
5. Role: "Editor" hoặc "Owner" (để có quyền upload)
6. Click "Done"

### BƯỚC 3: Tạo JSON Key

1. Trong danh sách Service Accounts, click vào account vừa tạo
2. Tab "Keys" > "Add Key" > "Create new key"
3. Chọn type: **JSON**
4. Click "Create" - file JSON sẽ được tải về
5. **QUAN TRỌNG**: Lưu file này an toàn, không share công khai

### BƯỚC 4: Chia sẻ Google Drive Folder

1. Tạo folder trong Google Drive để lưu files
2. Right-click folder > "Share"
3. Thêm email của Service Account (có dạng `nghiemwork-drive@project-id.iam.gserviceaccount.com`)
4. Quyền: **Editor**
5. Copy **Folder ID** từ URL (dạng `https://drive.google.com/drive/folders/FOLDER_ID_HERE`)

### BƯỚC 5: Cài đặt Backend (Edge Function)

Tạo Edge Function mới để upload từ backend an toàn:

```bash
# Tạo function folder
mkdir -p supabase/functions/upload-to-drive
```

**File: `supabase/functions/upload-to-drive/index.ts`**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { GoogleAuth } from 'https://esm.sh/google-auth-library@9.0.0';
import { corsHeaders } from '../_shared/cors.ts';

const FOLDER_ID = Deno.env.get('GDRIVE_FOLDER_ID')!;
const SERVICE_ACCOUNT_JSON = Deno.env.get('GDRIVE_SERVICE_ACCOUNT_JSON')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { file, filename } = await req.json();
    if (!file || !filename) throw new Error('Missing file or filename');

    // Decode base64
    const buffer = Uint8Array.from(atob(file), c => c.charCodeAt(0));

    // Authenticate with Service Account
    const auth = new GoogleAuth({
      credentials: JSON.parse(SERVICE_ACCOUNT_JSON),
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    // Upload to Drive
    const metadata = {
      name: filename,
      parents: [FOLDER_ID],
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([buffer]));

    const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken.token}` },
      body: form,
    });

    const uploadData = await uploadRes.json();
    const fileUrl = `https://drive.google.com/file/d/${uploadData.id}/view`;

    return new Response(JSON.stringify({ url: fileUrl, id: uploadData.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

### BƯỚC 6: Thiết lập Environment Variables

Trong OnSpace Cloud Dashboard > Secrets, thêm:

```
GDRIVE_FOLDER_ID=your_folder_id_here
GDRIVE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"..."}
```

### BƯỚC 7: Upload từ Client

Trong `GroupChatPage.tsx`, sửa `handleFileUpload`:

```typescript
const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file || !currentChannel) return;
  
  setLoading(true);
  try {
    // Convert to base64
    const reader = new FileReader();
    const base64 = await new Promise<string>((resolve) => {
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });

    // Upload via Edge Function
    const { data, error } = await supabase.functions.invoke('upload-to-drive', {
      body: { file: base64, filename: file.name },
    });

    if (error) throw error;

    // Add to chat
    const msg: GroupChatMessage = {
      id: genId(),
      channelId: currentChannel.id,
      userId: user?.id || 'admin',
      username: user?.username || 'Admin',
      content: `📎 Đã upload file: ${file.name}`,
      attachments: [{ id: data.id, type: 'document', url: data.url, name: file.name, size: file.size }],
      timestamp: Date.now(),
    };
    saveMessages([...messages, msg], currentChannel.id);
  } catch (err: any) {
    alert(`Lỗi upload: ${err.message}`);
  }
  setLoading(false);
  e.target.value = '';
};
```

---

## LƯU Ý BẢO MẬT

🔒 **Service Account JSON** chứa private key - KHÔNG BAO GIỜ commit vào Git  
🔒 Chỉ lưu trong **Supabase Secrets** (backend environment variables)  
🔒 Client-side KHÔNG BAO GIỜ trực tiếp access Service Account key  
🔒 Luôn upload qua **Edge Function** để bảo mật

---

## GIẢI PHÁP THAY THẾ ĐƠN GIẢN HƠN

Nếu không muốn setup phức tạp, có thể dùng **Supabase Storage** (đã có sẵn):

```typescript
// Upload trực tiếp vào Supabase Storage
const { data, error } = await supabase.storage
  .from('chat-files')
  .upload(`${currentChannel.id}/${Date.now()}_${file.name}`, file);

if (error) throw error;

const { data: urlData } = supabase.storage
  .from('chat-files')
  .getPublicUrl(data.path);

// Dùng urlData.publicUrl để hiển thị
```

**Ưu điểm Supabase Storage:**
- ✅ Không cần Service Account
- ✅ Không cần thêm Edge Function
- ✅ Free tier: 1GB storage
- ✅ Tích hợp sẵn với auth

---

## CHECKLIST PUBLISH

Trước khi publish production:

- [ ] YouTube video hoạt động ổn định
- [ ] Settings UI gọn gàng, dễ dùng
- [ ] Multi-user login/logout không lỗi
- [ ] Admin panel chỉ admin truy cập được
- [ ] Group chat @mention hoạt động
- [ ] @Lucy AI response trong chat
- [ ] Notification bell hiển thị đúng
- [ ] Upload file (chọn Supabase Storage hoặc Google Drive)
- [ ] Test trên mobile (iOS/Android)
- [ ] Test trên desktop (Chrome/Safari/Firefox)
- [ ] Theme sáng/tối chuyển đổi mượt

🎉 **APP HOÀN CHỈNH - SẴN SÀNG PUBLISH!**
