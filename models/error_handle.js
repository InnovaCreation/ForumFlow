module.exports.db_callback = (err,data) => {
	if (err) {
		if (err.name == 'CastError' && err.kind == 'ObjectId') {
			return null;
		} else {
			throw err;
		}
	}
}

module.exports.promise_reject = (err) => {
	return Promise.reject(err)
}

module.exports.promise_reject_end = (err) => {
	console.log("Promise Rejected :" + err)
}
