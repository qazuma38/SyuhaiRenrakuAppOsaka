# Cleanup Scheduler Edge Function

## 概要
データクリーンアップ機能のスケジューラーです。毎週日曜日の午前2時（JST）に自動的にクリーンアップ処理を実行します。

## 実行スケジュール
- **自動実行**: 毎週日曜日 午前2:00-2:05（JST）
- **手動実行**: `force=true` パラメータで任意のタイミングで実行可能

## 使用方法

### 自動スケジュール確認
```bash
curl https://your-project.supabase.co/functions/v1/cleanup-scheduler
```

### 手動実行
```bash
curl "https://your-project.supabase.co/functions/v1/cleanup-scheduler?force=true"
```

## Cronジョブ設定例
このスケジューラーを定期的に呼び出すためのcronジョブ設定例：

```bash
# 毎時0分に実行（スケジュール時間をチェック）
0 * * * * curl -s https://your-project.supabase.co/functions/v1/cleanup-scheduler
```

## レスポンス例

### スケジュール時間外
```json
{
  "scheduled": false,
  "message": "Not scheduled time (Sunday 2:00-2:05 AM JST)",
  "currentTime": "2024-01-15T10:30:00.000Z",
  "nextScheduled": "2024-01-21T17:00:00.000Z"
}
```

### スケジュール実行時
```json
{
  "scheduled": true,
  "triggered": true,
  "message": "Cleanup automatically triggered",
  "currentTime": "2024-01-21T17:02:00.000Z",
  "cleanupResult": {
    "success": true,
    "message": "Cleanup completed. Found: 150, Deleted: 150, Errors: 0"
  }
}
```

## 機能
1. **時間チェック**: 現在時刻が日曜日2:00-2:05 AM（JST）かを確認
2. **クリーンアップ実行**: 条件が満たされた場合、cleanup-old-data関数を呼び出し
3. **結果報告**: 実行結果とスケジュール情報を返却
4. **手動トリガー**: force パラメータによる手動実行をサポート

## 注意事項
- JST（日本標準時）基準で動作
- 2:00-2:05の5分間のウィンドウで実行
- 外部cronジョブまたは定期的な呼び出しが必要