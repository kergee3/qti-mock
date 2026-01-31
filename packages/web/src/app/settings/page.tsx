'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Slider,
} from '@mui/material';
import { useSettings, NavigationPosition, FontSize, AiModel } from '@/contexts/SettingsContext';
import MicIcon from '@mui/icons-material/Mic';

const fontSizeMarks = [
  { value: 80, label: '80%' },
  { value: 90, label: '90%' },
  { value: 100, label: '100%' },
  { value: 110, label: '110%' },
  { value: 120, label: '120%' },
  { value: 130, label: '130%' },
  { value: 150, label: '150%' },
];

export default function SettingsPage() {
  const { navigationPosition, setNavigationPosition, fontSize, setFontSize, aiModel, setAiModel, voiceInputEnabled, setVoiceInputEnabled, rubyEnabled, setRubyEnabled } = useSettings();
  const [isLocalhost, setIsLocalhost] = useState(false);

  useEffect(() => {
    // localhost でのみ Sonnet モデルを選択可能にする
    const hostname = window.location.hostname;
    setIsLocalhost(hostname === 'localhost' || hostname === '127.0.0.1');
  }, []);

  const handlePositionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNavigationPosition(event.target.value as NavigationPosition);
  };

  const handleFontSizeChange = (_event: Event, newValue: number | number[]) => {
    setFontSize(newValue as FontSize);
  };

  const handleAiModelChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAiModel(event.target.value as AiModel);
  };

  const handleVoiceInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setVoiceInputEnabled(event.target.value === 'enabled');
  };

  const handleRubyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRubyEnabled(event.target.value === 'ari');
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      {/* 音声入力機能 */}
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <FormControl component="fieldset">
            <FormLabel component="legend">
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MicIcon fontSize="small" />
                音声入力機能
              </Typography>
            </FormLabel>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              QTI 3.0 のテキスト入力領域で Web Speech API を使用した音声入力機能を設定します。
            </Typography>
            <Typography variant="body2" color="warning.main" sx={{ mb: 2 }}>
              ※ Chrome / Edge / Safari で利用可能です。Firefox は非対応です。
            </Typography>
            <RadioGroup
              row
              value={voiceInputEnabled ? 'enabled' : 'disabled'}
              onChange={handleVoiceInputChange}
            >
              <FormControlLabel
                value="enabled"
                control={<Radio />}
                label="有効"
              />
              <FormControlLabel
                value="disabled"
                control={<Radio />}
                label="無効"
              />
            </RadioGroup>
          </FormControl>
        </CardContent>
      </Card>

      {/* ルビ表示 */}
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <FormControl component="fieldset">
            <FormLabel component="legend">
              <Typography variant="h6">ルビ表示</Typography>
            </FormLabel>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              ルビ表示なしでは、元の問題にルビが含まれている場合には、ルビを削除して表示します。
            </Typography>
            <RadioGroup
              row
              value={rubyEnabled ? 'ari' : 'nashi'}
              onChange={handleRubyChange}
            >
              <FormControlLabel value="ari" control={<Radio />} label="あり" />
              <FormControlLabel value="nashi" control={<Radio />} label="なし" />
            </RadioGroup>
          </FormControl>
        </CardContent>
      </Card>

      {/* AI採点モデル */}
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <FormControl component="fieldset">
            <FormLabel component="legend">
              <Typography variant="h6">AI採点モデル</Typography>
            </FormLabel>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              AI記述式採点で使用するモデルを選択してください。
            </Typography>
            <RadioGroup
              value={aiModel}
              onChange={handleAiModelChange}
            >
              <FormControlLabel
                value="claude-haiku-4.5"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1">Claude Haiku 4.5（推奨）</Typography>
                    <Typography variant="body2" color="text.secondary">
                      最新・最速モデル。高いインテリジェンスと低コスト。小学生の記述式採点に十分な品質
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="claude-sonnet-4.5"
                control={<Radio />}
                disabled={!isLocalhost}
                label={
                  <Box>
                    <Typography variant="body1" color={!isLocalhost ? 'text.disabled' : undefined}>
                      Claude Sonnet 4.5
                      {!isLocalhost && ' (localhost のみ)'}
                    </Typography>
                    <Typography variant="body2" color={!isLocalhost ? 'text.disabled' : 'text.secondary'}>
                      最新・高品質モデル。複雑なタスクに最適
                    </Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </FormControl>
        </CardContent>
      </Card>

      <Card sx={{ mt: 2 }}>
        <CardContent>
          <FormControl component="fieldset" sx={{ width: '100%' }}>
            <FormLabel component="legend">
              <Typography variant="h6">問題での文字サイズ</Typography>
            </FormLabel>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              問題文やルビの表示サイズを調整します。基本問題からPlaygroundまで全ての問題の実行時に共通で適用されます。
            </Typography>
            <Box sx={{ px: 2 }}>
              <Slider
                value={fontSize}
                onChange={handleFontSizeChange}
                aria-labelledby="font-size-slider"
                step={null}
                marks={fontSizeMarks}
                min={80}
                max={150}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value}%`}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
              現在の設定: {fontSize}%
            </Typography>
          </FormControl>
        </CardContent>
      </Card>

      <Card sx={{ mt: 2 }}>
        <CardContent>
          <FormControl component="fieldset">
            <FormLabel component="legend">
              <Typography variant="h6">Navigation Position</Typography>
            </FormLabel>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              ナビゲーションバーの表示位置を選択してください。
            </Typography>
            <RadioGroup
              value={navigationPosition}
              onChange={handlePositionChange}
            >
              <FormControlLabel
                value="auto"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1">Auto (自動)</Typography>
                    <Typography variant="body2" color="text.secondary">
                      デバイスと画面の向きに応じて自動的に切り替えます
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="top"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1">Top (上部タブ)</Typography>
                    <Typography variant="body2" color="text.secondary">
                      常に画面上部にタブを表示します
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="left"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1">Left (サイドバー)</Typography>
                    <Typography variant="body2" color="text.secondary">
                      常に画面左側にサイドバーを表示します
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="bottom"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1">Bottom (下部ナビ)</Typography>
                    <Typography variant="body2" color="text.secondary">
                      常に画面下部にナビゲーションを表示します
                    </Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </FormControl>
        </CardContent>
      </Card>
    </Box>
  );
}
