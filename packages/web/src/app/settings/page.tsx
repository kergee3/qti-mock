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
} from '@mui/material';
import { useSettings, NavigationPosition } from '@/contexts/SettingsContext';

export default function SettingsPage() {
  const { navigationPosition, setNavigationPosition } = useSettings();

  const handlePositionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNavigationPosition(event.target.value as NavigationPosition);
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
    </Box>
  );
}
