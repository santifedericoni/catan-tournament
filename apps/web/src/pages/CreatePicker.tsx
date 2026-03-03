import {
  Box,
  Typography,
  Card,
  CardActionArea,
  CardContent,
  Button,
  Grid,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import GroupsIcon from '@mui/icons-material/Groups';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';

export function CreatePicker() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const cp = t.createPicker;

  return (
    <Box maxWidth="sm" mx="auto" mt={4}>
      <Typography variant="h4" fontWeight={700} mb={1} textAlign="center">
        {cp.title}
      </Typography>
      <Typography variant="body1" color="text.secondary" textAlign="center" mb={5}>
        🏰
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card
            sx={{
              border: 2,
              borderColor: 'primary.main',
              transition: 'box-shadow 0.2s',
              '&:hover': { boxShadow: 6 },
            }}
          >
            <CardActionArea onClick={() => navigate('/tournaments/create')} sx={{ p: 1 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                  <Box
                    sx={{
                      bgcolor: 'primary.main',
                      color: 'white',
                      borderRadius: 2,
                      p: 1,
                      display: 'flex',
                    }}
                  >
                    <EmojiEventsIcon fontSize="large" />
                  </Box>
                  <Typography variant="h5" fontWeight={700}>
                    {cp.tournamentTitle}
                  </Typography>
                </Box>
                <Typography variant="body1" color="text.secondary" mb={2}>
                  {cp.tournamentDesc}
                </Typography>
                <Button
                  variant="contained"
                  endIcon={<ArrowForwardIcon />}
                  onClick={(e) => { e.stopPropagation(); navigate('/tournaments/create'); }}
                >
                  {cp.tournamentCta}
                </Button>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card
            sx={{
              border: 2,
              borderColor: 'secondary.main',
              transition: 'box-shadow 0.2s',
              '&:hover': { boxShadow: 6 },
            }}
          >
            <CardActionArea onClick={() => navigate('/leagues/create')} sx={{ p: 1 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                  <Box
                    sx={{
                      bgcolor: 'secondary.main',
                      color: 'white',
                      borderRadius: 2,
                      p: 1,
                      display: 'flex',
                    }}
                  >
                    <GroupsIcon fontSize="large" />
                  </Box>
                  <Typography variant="h5" fontWeight={700}>
                    {cp.leagueTitle}
                  </Typography>
                </Box>
                <Typography variant="body1" color="text.secondary" mb={2}>
                  {cp.leagueDesc}
                </Typography>
                <Button
                  variant="contained"
                  color="secondary"
                  endIcon={<ArrowForwardIcon />}
                  onClick={(e) => { e.stopPropagation(); navigate('/leagues/create'); }}
                >
                  {cp.leagueCta}
                </Button>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
