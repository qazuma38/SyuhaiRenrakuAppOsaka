# Data Cleanup Edge Function

## 概要
このエッジファンクションは、データベースから15日以上古いレコードを削除し、削除前にCSVファイルとしてアーカイブします。

## 対象テーブル
- `message_logs` - メッセージログ
- `user_sessions` - ユーザーセッション
- `chat_messages` - チャットメッセージ

## 実行スケジュール
毎週日曜日の午前2時に自動実行されます。

## 機能
1. **データ取得**: 15日前より古いレコードを各テーブルから取得
2. **アーカイブ**: 削除前のデータをCSVファイルとして `/tmp` ディレクトリに保存
3. **削除**: 古いレコードをデータベースから削除
4. **ログ**: 処理結果をサマリーファイルとして保存

## アーカイブファイル形式（CSV）
```csv
# Archive created: 2024-01-21T17:00:00.000Z
# Table: message_logs
# Cutoff date: 2024-01-06T17:00:00.000Z
# Record count: 50
# Columns: id, sender_id, receiver_id, message, created_at

id,sender_id,receiver_id,message,created_at
uuid1,user1,user2,"Hello, world!",2024-01-01T10:00:00.000Z
uuid2,user2,user1,"Hi there!",2024-01-01T10:01:00.000Z
```

## 手動実行
```bash
curl -X POST https://your-project.supabase.co/functions/v1/cleanup-old-data
```

## 環境変数
- `SUPABASE_URL`: Supabaseプロジェクトの URL
- `SUPABASE_SERVICE_ROLE_KEY`: サービスロールキー

## エラーハンドリング
- テーブルごとに独立してエラーハンドリング
- 一つのテーブルでエラーが発生しても他のテーブルの処理は継続
- 詳細なエラーログとサマリーを出力

## CSVファイルの特徴
- **メタデータ**: ファイル先頭にコメント形式でアーカイブ情報を記載
- **エスケープ処理**: カンマ、引用符、改行を含むデータを適切にエスケープ
- **Excel対応**: Microsoft ExcelやGoogle Sheetsで直接開ける形式
- **軽量**: JSONと比較してファイルサイズが小さい