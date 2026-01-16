'use client';

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
import { useSettings, NavigationPosition, FontSize } from '@/contexts/SettingsContext';

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
  const { navigationPosition, setNavigationPosition, fontSize, setFontSize } = useSettings();

  const handlePositionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNavigationPosition(event.target.value as NavigationPosition);
  };

  const handleFontSizeChange = (_event: Event, newValue: number | number[]) => {
    setFontSize(newValue as FontSize);
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>

      <Card sx={{ mt: 3 }}>
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

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <FormControl component="fieldset" sx={{ width: '100%' }}>
            <FormLabel component="legend">
              <Typography variant="h6">文字サイズ</Typography>
            </FormLabel>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              問題文やルビの表示サイズを調整します。基本問題とPlaygroundに共通で適用されます。
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
    </Box>
  );
}
