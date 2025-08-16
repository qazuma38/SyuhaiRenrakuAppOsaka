# Data Cleanup Edge Function

## 概要
このエッジファンクションは、データベースから15日以上古いレコードを削除し、削除前にJSONファイルとしてアーカイブします。

## 対象テーブル
- `message_logs` - メッセージログ
- `user_sessions` - ユーザーセッション
- `chat_messages` - チャットメッセージ

## 実行スケジュール
毎週日曜日の午前2時に自動実行されます。

## 機能
1. **データ取得**: 15日前より古いレコードを各テーブルから取得
2. **アーカイブ**: 削除前のデータをJSONファイルとして `/tmp` ディレクトリに保存
3. **削除**: 古いレコードをデータベースから削除
4. **ログ**: 処理結果をサマリーファイルとして保存

## アーカイブファイル形式
```json
{
  "table": "テーブル名",
  "archiveDate": "アーカイブ作成日時",
  "cutoffDate": "削除基準日時",
  "recordCount": "レコード数",
  "records": [削除されたレコードの配列]
}
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