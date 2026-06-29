const success = (res, data = null, message = 'Operación exitosa') => {
  return res.status(200).json({ success: true, message, data });
};

const error = (res, message = 'Error interno', status = 500, details = null) => {
  return res.status(status).json({ success: false, message, details });
};

module.exports = { success, error };