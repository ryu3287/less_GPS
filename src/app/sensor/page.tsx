'use client'

import { useState } from 'react'
import { useSensorRecorder } from '@/components/SensorRecorderProvider'

function calcAltitude(pressure: number): number {
  return 44330 * (1 - Math.pow(pressure / 1013.25, 1 / 5.255))
}

export default function SensorPage() {
  const {
    isRecording,
    label,
    setLabel,
    logs,
    sessionId,
    accel,
    gyro,
    pressure,
    error,
    startRecording,
    stopRecording,
    clearLogs: clearRecordedLogs,
  } = useSensorRecorder()
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const saveToDb = async () => {
    if (logs.length === 0) return
    setSaving(true)
    setSaveMsg(null)
    try {
      const res = await fetch('/api/sensor-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs }),
      })
      const data = await res.json()
      setSaveMsg(data.success ? `✅ ${data.count}件を保存しました` : `❌ 保存失敗: ${data.error}`)
    } catch (e) {
      setSaveMsg(`❌ エラー: ${String(e)}`)
    } finally {
      setSaving(false)
    }
  }

  const downloadCsv = () => {
    if (logs.length === 0) return
    const header = 'timestamp,accel_x,accel_y,accel_z,gyro_x,gyro_y,gyro_z,pressure,altitude,label'
    const rows = logs.map(l =>
      [l.timestamp, l.accel_x, l.accel_y, l.accel_z,
        l.gyro_x, l.gyro_y, l.gyro_z, l.pressure, l.altitude, l.label].join(',')
    )
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `sensor_${sessionId}.csv`
    a.click()
  }

  const clearLogs = () => {
    if (!confirm('記録データをクリアしますか？')) return
    clearRecordedLogs()
    setSaveMsg(null)
  }

  const fmt = (v: number | null) => v !== null ? v.toFixed(2) : '---'

  const LABELS = ['歩行中', '電車', 'バス', '車', '静止中', 'その他']

  return (
    <div className="min-h-screen bg-stone-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-stone-200 px-4 py-3 sticky top-0 z-10">
        <h1 className="text-base font-bold text-stone-800">📡 センサー計測</h1>
        <p className="text-xs text-stone-400 mt-0.5">加速度・ジャイロ・気圧をリアルタイム記録</p>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">

        {/* エラー */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-amber-800">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-600">Low GPS Design</p>
          <p className="mt-1 text-xs leading-5 text-amber-700">
            移動中はGPSを使わず、写真撮影時だけ位置を確定させます。記録後にアンカーとセンサーログで経路を確認できます。
          </p>
          <a href="/" className="mt-2 inline-block text-xs font-medium text-amber-800 underline underline-offset-2">
            地図で経路を見る
          </a>
        </div>

        {/* リアルタイム数値カード */}
        <div className="grid grid-cols-3 gap-2">
          {/* 加速度 */}
          <div className="bg-white rounded-2xl p-3 border border-stone-100 shadow-sm">
            <p className="text-xs font-bold text-teal-500 mb-2">加速度</p>
            <p className="text-xs text-stone-500">X <span className="font-mono text-stone-800">{fmt(accel?.x ?? null)}</span></p>
            <p className="text-xs text-stone-500">Y <span className="font-mono text-stone-800">{fmt(accel?.y ?? null)}</span></p>
            <p className="text-xs text-stone-500">Z <span className="font-mono text-stone-800">{fmt(accel?.z ?? null)}</span></p>
            <p className="text-[9px] text-stone-300 mt-1">m/s²</p>
          </div>
          {/* ジャイロ */}
          <div className="bg-white rounded-2xl p-3 border border-stone-100 shadow-sm">
            <p className="text-xs font-bold text-sky-500 mb-2">ジャイロ</p>
            <p className="text-xs text-stone-500">α <span className="font-mono text-stone-800">{fmt(gyro?.x ?? null)}</span></p>
            <p className="text-xs text-stone-500">β <span className="font-mono text-stone-800">{fmt(gyro?.y ?? null)}</span></p>
            <p className="text-xs text-stone-500">γ <span className="font-mono text-stone-800">{fmt(gyro?.z ?? null)}</span></p>
            <p className="text-[9px] text-stone-300 mt-1">°/s</p>
          </div>
          {/* 気圧・高度 */}
          <div className="bg-white rounded-2xl p-3 border border-stone-100 shadow-sm">
            <p className="text-xs font-bold text-purple-500 mb-2">気圧・高度</p>
            <p className="text-xs text-stone-500">気圧</p>
            <p className="font-mono text-xs text-stone-800">{fmt(pressure)} hPa</p>
            <p className="text-xs text-stone-500 mt-1">高度</p>
            <p className="font-mono text-xs text-stone-800">
              {pressure ? fmt(calcAltitude(pressure)) : '---'} m
            </p>
          </div>
        </div>

        {/* ラベル選択 */}
        <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
          <p className="text-xs font-bold text-stone-500 mb-3">行動ラベル</p>
          <div className="grid grid-cols-3 gap-2">
            {LABELS.map(l => (
              <button
                key={l}
                onClick={() => setLabel(l)}
                className={`py-2 rounded-xl text-xs font-medium transition-colors ${
                  label === l
                    ? 'bg-teal-500 text-white shadow-sm'
                    : 'bg-stone-100 text-stone-600 active:bg-stone-200'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* 計測ステータス */}
        <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-stone-300'}`} />
            <div>
              <p className="text-sm font-medium text-stone-700">
                {isRecording ? '計測中...' : '停止中'}
              </p>
              <p className="text-xs text-stone-400">{logs.length} 件記録済み</p>
            </div>
          </div>
          <p className="text-xs text-stone-400 bg-stone-50 px-2 py-1 rounded-lg">
            {label}
          </p>
        </div>

        {/* メインボタン（大きめ・スマホ操作しやすく） */}
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="w-full py-4 bg-teal-500 text-white rounded-2xl font-bold text-base shadow-sm active:bg-teal-600 transition-colors"
          >
            ▶ 計測開始
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="w-full py-4 bg-red-500 text-white rounded-2xl font-bold text-base shadow-sm active:bg-red-600 transition-colors animate-pulse"
          >
            ⏹ 計測停止
          </button>
        )}

        {/* サブボタン */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={saveToDb}
            disabled={logs.length === 0 || saving}
            className="py-3 bg-green-500 text-white rounded-xl text-sm font-medium disabled:opacity-40 active:bg-green-600 transition-colors"
          >
            {saving ? '保存中' : '💾 保存'}
          </button>
          <button
            onClick={downloadCsv}
            disabled={logs.length === 0}
            className="py-3 bg-stone-700 text-white rounded-xl text-sm font-medium disabled:opacity-40 active:bg-stone-800 transition-colors"
          >
            📥 CSV
          </button>
          <button
            onClick={clearLogs}
            disabled={logs.length === 0 || isRecording}
            className="py-3 border border-stone-200 text-stone-500 rounded-xl text-sm font-medium disabled:opacity-40 active:bg-stone-50 transition-colors"
          >
            クリア
          </button>
        </div>

        {/* 保存メッセージ */}
        {saveMsg && (
          <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-600">
            {saveMsg}
          </div>
        )}

        {/* 直近ログ */}
        {logs.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
              <p className="text-xs font-bold text-stone-500">直近のログ</p>
              <p className="text-xs text-stone-400">最新5件</p>
            </div>
            <div className="divide-y divide-stone-50">
              {logs.slice(-5).reverse().map((log, i) => (
                <div key={i} className="px-4 py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-mono text-stone-500">
                      {new Date(log.timestamp).toLocaleTimeString('ja-JP')}
                    </p>
                    <p className="text-[10px] text-stone-400 mt-0.5">{log.label}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono text-stone-700">
                      Z: {fmt(log.accel_z)}
                    </p>
                    <p className="text-[10px] font-mono text-stone-400">
                      {fmt(log.pressure)} hPa
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 使い方ガイド（初回のみ） */}
        {logs.length === 0 && !isRecording && (
          <div className="bg-teal-50 rounded-2xl p-4 border border-teal-100">
            <p className="text-xs font-bold text-teal-700 mb-2">📖 使い方</p>
            <ol className="space-y-1">
              {[
                '行動ラベルを選択する',
                '「計測開始」をタップ（iOSは許可ダイアログが表示）',
                '歩く・電車に乗るなど実際に移動する',
                '「計測停止」をタップして記録を終了',
                '「保存」でDBに記録、または「CSV」でダウンロード',
              ].map((t, i) => (
                <li key={i} className="text-xs text-teal-600 flex gap-2">
                  <span className="text-teal-400 font-bold shrink-0">{i + 1}.</span>
                  {t}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* 下部余白（iPhone のホームバー対策） */}
        <div className="h-6" />
      </div>
    </div>
  )
}
