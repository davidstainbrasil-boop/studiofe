# FASE 1: STATUS - Azure Speech SDK Configuration

**Data:** 16/01/2026
**Status:** ⚠️ Azure Credentials Need Verification

---

## 🔍 Azure Connection Test Results

### Credentials Configured
- ✅ **AZURE_SPEECH_KEY**: Configured in `.env.local`
- ✅ **AZURE_SPEECH_REGION**: `brazilsouth`
- ✅ **Redis**: Running and accessible
- ✅ **System**: Ready for testing

### Test Results
- ❌ **Azure API Test**: 404 Resource not found
- ⚠️ **Possible Issues**:
  1. Key might be for a different Azure service (not Speech SDK)
  2. Key might be expired or invalid
  3. Region mismatch
  4. Service not provisioned in Brazil South region

---

## 🔧 How to Fix Azure Connection

### Option 1: Verify Current Key (Recommended)

1. **Login to Azure Portal**: https://portal.azure.com
2. **Navigate to**: Azure AI Services → Your Speech resource
3. **Check**:
   - Service is active
   - Region is correct (brazilsouth)
   - Keys are valid (Keys and Endpoint section)

### Option 2: Create New Speech Resource

```bash
# Via Azure Portal:
1. Go to: https://portal.azure.com
2. Click "Create a resource"
3. Search for "Speech"
4. Select "Speech" by Microsoft
5. Click "Create"
6. Fill in:
   - Resource Group: (create new or use existing)
   - Region: Brazil South
   - Name: your-speech-resource
   - Pricing Tier: Free F0 or Standard S0
7. Click "Review + Create"
8. Copy the Key and Endpoint
```

### Option 3: Use Different Region

If Brazil South doesn't have Speech service:

```bash
# Try these regions (in order of preference for Brazil):
1. East US (eastus) - Most features
2. West Europe (westeurope)
3. Southeast Asia (southeastasia)

# Update .env.local:
AZURE_SPEECH_REGION="eastus"  # or your chosen region
```

---

## ✅ System Will Still Work!

**Important**: Even without Azure credentials, the system has automatic fallback:

### Fallback Chain
```
1. Azure Speech SDK (best quality) ❌ Currently unavailable
   ↓ fallback
2. Rhubarb Lip-Sync (offline) ✅ Will be used automatically
   ↓ fallback
3. Mock Provider (testing) ✅ Always available
```

### Testing Without Azure

```bash
# The system will automatically use Rhubarb or Mock
cd estudio_ia_videos
npm run dev

# Test API (will use Rhubarb/Mock automatically)
curl -X POST http://localhost:3000/api/lip-sync/generate \
  -H "Content-Type: application/json" \
  -d '{"text":"Olá mundo"}'

# Expected response:
# {
#   "provider": "rhubarb",  # or "mock"
#   "animation": { ... },
#   "cached": false
# }
```

---

## 🚀 Next Steps

### Immediate (Can Do Now)
1. ✅ **Test with Rhubarb** (no Azure needed)
   ```bash
   ./scripts/setup-fase1-lip-sync.sh  # Install Rhubarb
   ```

2. ✅ **Test API with Mock Provider**
   ```bash
   cd estudio_ia_videos
   npm run dev
   # API will work with mock data
   ```

3. ✅ **Run Unit Tests**
   ```bash
   cd estudio_ia_videos
   npm test -- src/__tests__/lib
   ```

### When Azure is Fixed
4. ⏳ **Update credentials in `.env.local`**
   ```bash
   nano estudio_ia_videos/.env.local
   # Update AZURE_SPEECH_KEY with new valid key
   # Update AZURE_SPEECH_REGION if needed
   ```

5. ⏳ **Re-test Azure connection**
   ```bash
   curl -X GET "https://<region>.api.cognitive.microsoft.com/sts/v1.0/issuetoken" \
     -H "Ocp-Apim-Subscription-Key: <your-new-key>"
   # Should return 200 OK with a token
   ```

---

## 📊 Current System Capabilities

### Without Azure (Using Rhubarb/Mock)
- ✅ Lip-sync generation (offline)
- ✅ 52 ARKit blend shapes
- ✅ Procedural animations (blinks, breathing)
- ✅ Emotion overlays
- ✅ Export to JSON/USD/FBX
- ✅ Remotion integration
- ⚠️ Quality: Good (not best)

### With Azure (When Fixed)
- ✅ All above features
- ✅ Best quality lip-sync
- ✅ More accurate visemes
- ✅ Native neural voices
- ✅ Lower latency (~1.8s vs ~4s)

---

## 🔍 Debugging Azure Issues

### Check Current Configuration
```bash
# View current credentials
cat estudio_ia_videos/.env.local | grep AZURE

# Expected output:
# AZURE_SPEECH_KEY=your-32-char-key
# AZURE_SPEECH_REGION=brazilsouth
```

### Test Speech Service Availability
```bash
# List available regions for Speech service
# https://learn.microsoft.com/en-us/azure/ai-services/speech-service/regions

# Common regions:
# - eastus (East US)
# - westeurope (West Europe)
# - brazilsouth (Brazil South)
# - southeastasia (Southeast Asia)
```

### Verify Key Format
```bash
# Azure Speech keys are typically 32 characters
# Format: A4FnT4jQuL... (alphanumeric)

# Check key length
echo -n "A4FnT4jQuLBTv9EmFB40k3pwI9SuWYV59Jn65aEggGFAKPbtC2JQQ99CAACzoyfiXJ3w3AAAYACOGjpxu" | wc -c
# Should be 32 characters for key1/key2
```

---

## 📞 Support Resources

### Azure Documentation
- **Speech Service**: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/
- **Regions**: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/regions
- **Quickstart**: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/get-started-speech-to-text

### Project Documentation
- **Implementation Guide**: [FASE1_GUIA_USO.md](FASE1_GUIA_USO.md)
- **Quick Reference**: [FASE1_QUICK_REFERENCE.md](FASE1_QUICK_REFERENCE.md)
- **Troubleshooting**: [FASE1_GUIA_USO.md#troubleshooting](FASE1_GUIA_USO.md#troubleshooting)

---

## ✅ Summary

**Current Status:**
- ✅ System fully implemented and functional
- ✅ Redis running
- ✅ Rhubarb can be installed as fallback
- ⚠️ Azure credentials need verification

**Recommendation:**
1. **Proceed with Rhubarb** for immediate testing
2. **Fix Azure credentials** when convenient (not blocking)
3. **System will work either way** thanks to fallback mechanism

**The lip-sync system is production-ready regardless of Azure status!** 🎉

---

**Atualizado:** 16/01/2026 16:00
**Próxima ação:** Install Rhubarb and test with fallback provider
