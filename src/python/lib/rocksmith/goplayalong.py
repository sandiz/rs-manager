import xml.etree.ElementTree as ET


def read_xml(file):
    tree = ET.parse(file)
    root = tree.getroot()

    gpx = {child.tag: child.text for child in root}
    gpx.update(root.attrib)

    sync_string = [y.split(';') for y in gpx['sync'].split('#')[1:]]
    gpx['sync'] = {
        float(bar) + float(measure): float(time) / 1000.0
        for time, bar, measure, _ in sync_string
    }
    return gpx
