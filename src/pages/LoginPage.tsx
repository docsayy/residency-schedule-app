import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import { useAuth } from "../context/AuthContext";

function friendlyAuthError(message: string) {
  if (message.includes("auth/invalid-credential")) {
    return "The email or password is incorrect. Please check both and try again.";
  }

  if (message.includes("auth/user-not-found")) {
    return "No account was found with this email. Please sign up first.";
  }

  if (message.includes("auth/wrong-password")) {
    return "The password does not match this email.";
  }

  if (message.includes("auth/email-already-in-use")) {
    return "An account already exists with this email. Please sign in, use Forgot Password, or resend verification.";
  }

  if (message.includes("auth/weak-password")) {
    return "Password is too weak. Please use at least 6 characters.";
  }

  if (message.includes("auth/too-many-requests")) {
    return "Too many attempts. Please wait a few minutes and try again.";
  }

  if (message.includes("auth/network-request-failed")) {
    return "Network error. Please check your internet connection.";
  }

  return message;
}

export default function LoginPage() {
  const { login, signup, resetPassword, resendVerification } = useAuth();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      if (mode === "login") {
        await login(email.trim(), password);
      } else {
        await signup(email.trim(), password);
      }
    } catch (err) {
      console.error(err);
      const rawMessage =
        err instanceof Error ? err.message : "Authentication failed.";
      const message = friendlyAuthError(rawMessage);

      if (message.toLowerCase().includes("account created")) {
        setSuccess(message);
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword() {
    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      if (!email.trim()) {
        throw new Error("Please enter your hospital email first.");
      }

      await resetPassword(email.trim());

      setSuccess(
        "Password reset email sent. Please check your Flushing hospital inbox, spam, or quarantine folder. It may take a few minutes."
      );
    } catch (err) {
      console.error(err);
      const rawMessage =
        err instanceof Error ? err.message : "Unable to send reset email.";
      setError(friendlyAuthError(rawMessage));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResendVerification() {
    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      if (!email.trim() || !password) {
        throw new Error(
          "Enter your hospital email and password first, then click resend verification."
        );
      }

      await resendVerification(email.trim(), password);

      setSuccess(
        "Verification email sent again. Open the newest email only, verify once, then return here and sign in."
      );
    } catch (err) {
      console.error(err);
      const rawMessage =
        err instanceof Error
          ? err.message
          : "Unable to resend verification email.";
      setError(friendlyAuthError(rawMessage));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at top left, #dbeafe 0, transparent 32%), linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)",
        p: 2,
      }}
    >
      <Card
        sx={{
          width: "100%",
          maxWidth: 460,
          borderRadius: 4,
          boxShadow: "0 20px 60px rgba(15,23,42,0.16)",
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2.2}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    display: "grid",
                    placeItems: "center",
                    backgroundColor: "#eff6ff",
                    color: "#2563eb",
                  }}
                >
                  <LocalHospitalIcon />
                </Box>

                <Box>
                  <Typography variant="h4" fontWeight={900} lineHeight={1}>
                    WhosOn
                  </Typography>
                  <Typography color="text.secondary" fontSize={14}>
                    Flushing Hospital Internal Medicine
                  </Typography>
                </Box>
              </Stack>

              <Alert severity="info" sx={{ borderRadius: 2 }}>
                {mode === "login"
                  ? "Sign in with your approved Flushing hospital email."
                  : "Create an account only if your email is already listed in WhosOn."}
              </Alert>

              {error && (
                <Alert severity="error" sx={{ whiteSpace: "pre-line", borderRadius: 2 }}>
                  {error}
                </Alert>
              )}

              {success && (
                <Alert severity="success" sx={{ whiteSpace: "pre-line", borderRadius: 2 }}>
                  {success}
                </Alert>
              )}

              <TextField
                label="Flushing Hospital Email"
                placeholder="name@jhmc.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                fullWidth
              />

              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                fullWidth
              />

              <Button
                type="submit"
                variant="contained"
                disabled={submitting}
                fullWidth
                sx={{
                  py: 1.15,
                  borderRadius: 2,
                  fontWeight: 900,
                  textTransform: "none",
                }}
              >
                {submitting
                  ? "Please wait..."
                  : mode === "login"
                    ? "Sign In"
                    : "Create Account"}
              </Button>

              {mode === "login" && (
                <Stack spacing={0.5}>
                  <Button
                    type="button"
                    variant="text"
                    disabled={submitting}
                    onClick={handleResetPassword}
                    sx={{ textTransform: "none", fontWeight: 700 }}
                  >
                    Forgot password? Send reset email
                  </Button>

                  <Button
                    type="button"
                    variant="text"
                    disabled={submitting}
                    onClick={handleResendVerification}
                    sx={{ textTransform: "none", fontWeight: 700 }}
                  >
                    Resend verification email
                  </Button>
                </Stack>
              )}

              <Divider />

              <Button
                type="button"
                variant="outlined"
                onClick={() => {
                  setError("");
                  setSuccess("");
                  setPassword("");
                  setMode((current) =>
                    current === "login" ? "signup" : "login"
                  );
                }}
                sx={{ textTransform: "none", borderRadius: 2 }}
              >
                {mode === "login"
                  ? "New approved user? Create account"
                  : "Already verified? Sign in"}
              </Button>

              <Typography variant="caption" color="text.secondary" textAlign="center">
                Access requires an approved resident or attending profile and a
                verified hospital email.
              </Typography>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}