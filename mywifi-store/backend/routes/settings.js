const router = require("express").Router();
const { protect, adminOnly } = require("../middleware/auth");
const { getOrCreateSettings } = require("../paymentSettings");

// Admin: view current payment settings (secret is masked)
router.get("/payment", protect, adminOnly, async (req, res) => {
  const settings = await getOrCreateSettings();
  res.json({
    razorpayKeyId: settings.razorpayKeyId,
    razorpayKeySecretSet: !!settings.razorpayKeySecret,
    onlinePaymentEnabled: settings.onlinePaymentEnabled
  });
});

// Admin: update payment settings
router.put("/payment", protect, adminOnly, async (req, res) => {
  const { razorpayKeyId, razorpayKeySecret, onlinePaymentEnabled } = req.body;

  const settings = await getOrCreateSettings();
  if (razorpayKeyId !== undefined) settings.razorpayKeyId = razorpayKeyId;
  if (razorpayKeySecret) settings.razorpayKeySecret = razorpayKeySecret; // only overwrite if a new value was sent
  if (onlinePaymentEnabled !== undefined) settings.onlinePaymentEnabled = onlinePaymentEnabled;
  await settings.save();

  res.json({
    razorpayKeyId: settings.razorpayKeyId,
    razorpayKeySecretSet: !!settings.razorpayKeySecret,
    onlinePaymentEnabled: settings.onlinePaymentEnabled
  });
});

// Public: tells the storefront whether online payment is available, and the public key
router.get("/payment/public", async (req, res) => {
  const settings = await getOrCreateSettings();
  res.json({
    onlinePaymentEnabled: settings.onlinePaymentEnabled && !!settings.razorpayKeyId && !!settings.razorpayKeySecret,
    razorpayKeyId: settings.onlinePaymentEnabled ? settings.razorpayKeyId : ""
  });
});

module.exports = router;
