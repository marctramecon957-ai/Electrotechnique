/**
 * Détermine si le mode maintenance est actif en ce moment, que ce soit
 * activé manuellement (immédiat) ou programmé (créneau start → end).
 */
function getMaintenanceStatus(maintenance){
  const m = maintenance || { active:false, scheduledStart:null, scheduledEnd:null, message:"" };
  const now = Date.now();

  if(m.active){
    return { isActive:true, message: m.message || "", endsAt: m.scheduledEnd || null, mode:"manuel" };
  }
  if(m.scheduledStart && m.scheduledEnd && now >= m.scheduledStart && now <= m.scheduledEnd){
    return { isActive:true, message: m.message || "", endsAt: m.scheduledEnd, mode:"programme" };
  }
  return { isActive:false, message:"", endsAt:null, mode:null };
}

module.exports = { getMaintenanceStatus };
