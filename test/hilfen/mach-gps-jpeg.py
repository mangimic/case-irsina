"""Erzeugt ein JPEG mit einem von Hand gebauten EXIF-GPS-Block."""
import struct, sys

def rational(num, den=1):
    return struct.pack('<II', num, den)

def gps_jpeg(basis_jpeg, ziel, lat, lng):
    lat_ref = b'N' if lat >= 0 else b'S'
    lng_ref = b'E' if lng >= 0 else b'W'
    def dms(v):
        v = abs(v)
        g = int(v); m = int((v - g) * 60); s = (v - g - m / 60) * 3600
        return rational(g) + rational(m) + rational(round(s * 10000), 10000)

    # Aufbau (Offsets ab TIFF-Kopf):
    #   0   TIFF-Kopf            8 Bytes
    #   8   IFD0                18 Bytes  (1 Eintrag: Zeiger auf GPS-IFD)
    #   26  GPS-IFD             54 Bytes  (4 Eintraege)
    #   80  Breite, 3 Rationals 24 Bytes
    #   104 Laenge, 3 Rationals 24 Bytes
    GPS_IFD, LAT_DAT, LNG_DAT = 26, 80, 104

    tiff = b'II' + struct.pack('<HI', 42, 8)
    tiff += struct.pack('<H', 1)
    tiff += struct.pack('<HHI', 0x8825, 4, 1) + struct.pack('<I', GPS_IFD)
    tiff += struct.pack('<I', 0)

    assert len(tiff) == GPS_IFD, len(tiff)
    tiff += struct.pack('<H', 4)
    tiff += struct.pack('<HHI', 0x0001, 2, 2) + lat_ref + b'\x00\x00\x00'
    tiff += struct.pack('<HHI', 0x0002, 5, 3) + struct.pack('<I', LAT_DAT)
    tiff += struct.pack('<HHI', 0x0003, 2, 2) + lng_ref + b'\x00\x00\x00'
    tiff += struct.pack('<HHI', 0x0004, 5, 3) + struct.pack('<I', LNG_DAT)
    tiff += struct.pack('<I', 0)

    assert len(tiff) == LAT_DAT, len(tiff)
    tiff += dms(lat)
    assert len(tiff) == LNG_DAT, len(tiff)
    tiff += dms(lng)

    nutzlast = b'Exif\x00\x00' + tiff
    app1 = b'\xff\xe1' + struct.pack('>H', len(nutzlast) + 2) + nutzlast

    d = open(basis_jpeg, 'rb').read()
    open(ziel, 'wb').write(d[:2] + app1 + d[2:])

if __name__ == '__main__':
    basis, ziel, lat, lng = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
    gps_jpeg(basis, ziel, lat, lng)
