const express = require('express');
const { execSync } = require('child_process');
const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

// API 키 검증 미들웨어
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.X_API_KEY) {
    return res.status(401).json({
      error: '유효하지 않은 API 키입니다.',
    });
  }
  next();
};

app.post(process.env.API_RESOURCE_PATH, validateApiKey, (req, res) => {
  try {
    const { namespace, resourceName, resourceType } = req.body;

    if (!namespace || !resourceName || !resourceType) {
      return res.status(400).json({
        error: 'namespace, resourceName, resourceType는 필수입니다.',
      });
    }
    if (resourceType !== 'deployment' && resourceType !== 'statefulset') {
      return res.status(400).json({
        error: 'resourceType은 deployment 또는 statefulset만 가능합니다.',
      });
    }

    execSync(
      `kubectl rollout restart ${resourceType} ${resourceName} -n ${namespace}`,
    );

    const status = execSync(
      `kubectl rollout status ${resourceType} ${resourceName} -n ${namespace}`,
    ).toString('utf8');

    res.json({
      success: true,
      message: `${resourceType} ${resourceName} in namespace ${namespace} rollout started`,
      status,
    });
  } catch (error) {
    console.error('Rollout error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.listen(port);
