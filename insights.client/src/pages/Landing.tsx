import { Box, Typography, Button, Container, Paper } from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import CoffeeIcon from "@mui/icons-material/Coffee";
import InsightsIcon from "@mui/icons-material/Insights";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import { login } from "../services/authService";
import AppBar from "../components/AppBar";

export default function Landing() {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar />

      <Container maxWidth="lg">
        {/* Hero Section */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            py: 10,
            gap: 4,
          }}
        >
          <Box sx={{ maxWidth: 500 }}>
            <Typography
              variant="h2"
              fontWeight={800}
              gutterBottom
              sx={{ letterSpacing: "-1px" }}
            >
              INSIGHTS
            </Typography>
            <Typography
              variant="h5"
              color="text.secondary"
              sx={{ mb: 4, fontWeight: 300 }}
            >
              manage what you measure
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() => login()}
              startIcon={<GoogleIcon />}
              sx={{
                textTransform: "none",
                px: 4,
                py: 1.5,
                borderRadius: 2,
              }}
            >
              Sign in with Google
            </Button>
          </Box>

          <Paper
            elevation={0}
            sx={{
              width: 280,
              height: 280,
              borderRadius: 4,
              display: { xs: "none", md: "flex" },
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <ShowChartIcon sx={{ fontSize: 80, color: "primary.main" }} />
            <Typography color="primary.main">science graphic here</Typography>
          </Paper>
        </Box>

        {/* Preview Section */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 4,
            p: 6,
            textAlign: "center",
            bgcolor: "background.paper",
            border: "1px solid #eee",
          }}
        >
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Discover correlations in your daily habits
          </Typography>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              gap: 6,
              mt: 4,
              flexWrap: "wrap",
            }}
          >
            <FeatureBox
              icon={<CoffeeIcon sx={{ fontSize: 40 }} />}
              title="Track habits"
              subtitle="Coffee, sleep, mood"
            />
            <FeatureBox
              icon={<InsightsIcon sx={{ fontSize: 40 }} />}
              title="See patterns"
              subtitle="Visual correlations"
            />
            <FeatureBox
              icon={<LightbulbIcon sx={{ fontSize: 40 }} />}
              title="Get insights"
              subtitle="Data-driven decisions"
            />
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

function FeatureBox({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Box sx={{ textAlign: "center", px: 3 }}>
      <Box sx={{ color: "primary.main", mb: 1 }}>{icon}</Box>
      <Typography variant="subtitle1" fontWeight={600}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {subtitle}
      </Typography>
    </Box>
  );
}
