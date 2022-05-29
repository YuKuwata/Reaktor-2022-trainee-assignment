const fs = require('fs');
const readFilePromise = (src) => {
    return new Promise((resolve, reject) => {
        fs.readFile(src, (err, data) => {
            if (err) {
                reject(err)
            }
            resolve(data.toString())
        })
    })
}

const findValue = (item, keyName) => {
    const keyIndex = item.indexOf(keyName);
    const valueEndingIndex = item.indexOf('\n', keyIndex);
    const verboseString = item.substring(keyIndex, valueEndingIndex);
    const startIndex = verboseString.indexOf('\"') + 1;
    const endIndex = verboseString.lastIndexOf('\"');
    const pureValue = verboseString.substring(startIndex, endIndex);
    return pureValue;
}

const findDependencies = (item) => {
    const dependencies = [];
    const dependenciesIndex = item.indexOf('[package.dependencies]');
    if (dependenciesIndex !== -1) {
        const dependenciesEndingIndex = item.indexOf('\n\n', dependenciesIndex);
        const verboseString = item.substring(dependenciesIndex, dependenciesEndingIndex);
        let startIndex = verboseString.indexOf('\n');
        while (startIndex !== -1) {
            const endIndex = verboseString.indexOf('=', startIndex);
            if (endIndex === -1) {
                break;
            }
            const dependencyName = verboseString.substring(startIndex + 1, endIndex).trim();
            dependencies.push(dependencyName);
            startIndex = verboseString.indexOf('\n', endIndex);
        }
    }
    const extraDependenciesIndex = item.indexOf('[package.extras]');
    if (extraDependenciesIndex !== -1) {
        const extraDependenciesEndingIndex = item.indexOf('\n\n', extraDependenciesIndex);
        const verboseString = item.substring(extraDependenciesIndex, extraDependenciesEndingIndex);
        const strList = verboseString.split('\n').slice(1);
        strList.forEach((item) => {
            const equalIndex = item.indexOf('=');
            const verboseItem = item.slice(equalIndex + 1).trim();
            const verboseList = eval(verboseItem);
            verboseList.forEach((value) => {
                const bracketIndex = value.indexOf('(');
                const pureValue = value.slice(0, bracketIndex === -1 ? undefined : bracketIndex).trim();
                dependencies.indexOf(pureValue) === -1 && dependencies.push(pureValue);
            })
        })
    }
    return dependencies;
}

const fileParsing = async (src) => {
    const data = await readFilePromise(src);
    const metaIndex = data.indexOf('[metadata]');
    const packageList = data.slice(0, metaIndex).split('[[package]]');
    const filteredList = packageList.filter((item) => {
        return item !== '';
    });

    const nameList = filteredList.map((value) => {
        return findValue(value, 'name');
    });

    const detailList = filteredList.map((item) => {
        const name = findValue(item, 'name');
        const description = findValue(item, 'description');
        const dependencies = findDependencies(item);
        dependencies.forEach((dependency,index) => {
            if (nameList.indexOf(dependency) === -1) {
                dependencies[index] = { name: dependency, installed: false }
            } else {
                dependencies[index] = { name: dependency, installed: true }
            }
        })
        return { name, description, dependencies }
    });

    detailList.forEach((detail) => {
        const { name } = detail;
        const revDependencies = [];
        detailList.forEach((value) => {
            const { dependencies, name: revDependency } = value;
            const hasRev = dependencies.find((dependency) => {
                return dependency.name === name
            });
            hasRev && revDependencies.push(revDependency);
            // if (dependencies.indexOf(name) !== -1) {
            //     revDependencies.push(revDependency);
            // }
        })
        detail.revDependencies = revDependencies;
    });
    return detailList;
}
module.exports = {
    renderList: async (req, res) => {
        const dataList = await fileParsing('./poetry.lock');
        const nameList = dataList.map(data => data.name);
        nameList.sort();
        res.render('./index.html', { data: nameList });
    },
    renderDetail: async (req, res) => {
        const { params: { packageName } } = req;
        const detailList = await fileParsing('./poetry.lock');
        const packageDetail = detailList.find(detail => detail.name === packageName);
        res.render('./detail.html', { data: packageDetail });
        // res.send(detailList);
    }
}