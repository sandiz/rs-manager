addEventListener('message', e => {
    if (!e) return;
    var obj = e.data,
        data = obj.data,
        numRows = data.length,
        newData = [];

    for (var y = 0; y < numRows; y++) {

        var row = data[y],
            numCols = row.length,
            ret = 0;

        for (var x = 0; x < numCols; x++) {
            ret += row[x];
        }

        newData.push(ret);
    }

    obj.data = newData;
    postMessage(obj);
});