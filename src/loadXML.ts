export const loadXML = async () => {
    const result = await fetch('./src/export.xml',{
        method: 'GET',
        cache: 'no-cache'
    });
    const xmlText = await result.text();

    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText,"application/xml");
    return xml;
};
