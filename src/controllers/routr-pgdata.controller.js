const service = require('../services/routr-pgdata.service');

async function exportModel(_req, res) {
  try {
    const result = await service.exportModelFromDatabase();
    res.json({
      ok: true,
      data: result,
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}

async function pushModel(_req, res) {
  try {
    const result = await service.pushModelFromDatabase();
    res.json({
      ok: true,
      data: result,
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}

module.exports = {
  exportModel,
  pushModel,
};