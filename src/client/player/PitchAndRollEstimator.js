function degToRad(deg) {
  return deg * Math.PI / 180;
}

function radToDeg(rad) {
  return rad * 180 / Math.PI;
}

export default class PitchAndRollEstimator {
  constructor() {
    this.filteredAccX = 0;
    this.filteredAccY = 0;
    this.filteredAccZ = 0;

    this.pitch = 0;
    this.roll = 0;
  }

  estimateFromAccelerationIncludingGravity(accX, accY, accZ) {
    // Low pass filter on accelerationIncludingGravity data
    const k = 0.8;
    let fX = this.filteredAccX;
    let fY = this.filteredAccY;
    let fZ = this.filteredAccZ;

    fX = k * fX + (1 - k) * accX;
    fY = k * fY + (1 - k) * accY;
    fZ = k * fZ + (1 - k) * accZ;

    this.filteredAccX = fX;
    this.filteredAccY = fY;
    this.filteredAccZ = fZ;

    const norm = Math.sqrt(fX * fX + fY * fY + fZ * fZ);
    fX /= norm;
    fY /= norm;
    fZ /= norm;

    this.pitch = radToDeg(Math.asin(fY)); // beta is in [-pi/2; pi/2[
    this.roll = radToDeg(Math.atan2(-fX, fZ)); // gamma is in [-pi; pi[
  }
}
