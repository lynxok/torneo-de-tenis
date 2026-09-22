import React from 'react';
import {
    ManualEnrollModal,
    ScoreInputModal,
    DisputeModal,
    GenerateFixtureModal,
    ReplacePlayerModal,
    ScheduleMatchModal,
    RainDelayModal,
    CalendarPickerModal,
    DeleteTournamentModal,
    EditTournamentModal,
    PlayerEnrollModal,
    EnrolledPlayersModal,
    OfficializeModal,
    ProjectionHelpModal,
    ReceiptViewerModal,
} from './index';
import { HeadToHeadModal } from '../HeadToHeadModal';
import { ShareGraphicModal } from '../ShareGraphicModal';
import { MatchQuickScorerModal } from '../MatchQuickScorerModal';
import { Tournament, Match, TournamentPlayer, User, Booking } from '../../types';

interface TournamentModalsContainerProps {
    showManualEnrollModal: boolean;
    setShowManualEnrollModal: (show: boolean) => void;
    tournament: Tournament;
    players: TournamentPlayer[];
    allProfiles: any[];
    loadingProfiles: boolean;
    enrollMode: 'user' | 'guest';
    setEnrollMode: (mode: 'user' | 'guest') => void;
    searchUserQuery: string;
    setSearchUserQuery: (query: string) => void;
    filterByGender: boolean;
    setFilterByGender: (filter: boolean) => void;
    selectedUserForEnroll: any;
    setSelectedUserForEnroll: (user: any) => void;
    guestName: string;
    setGuestName: (name: string) => void;
    guestPartnerName: string;
    setGuestPartnerName: (name: string) => void;
    guestCategory: string;
    setGuestCategory: (cat: string) => void;
    manualFee: string;
    setManualFee: (fee: string) => void;
    manualPaymentStatus: string;
    setManualPaymentStatus: (status: string) => void;
    manualAvailabilityNotes: string;
    setManualAvailabilityNotes: (notes: string) => void;
    handleManualEnrollSubmit: () => void;
    submittingEnroll: boolean;
    matchTournamentGender: (g?: string) => boolean;
    getUserMasterEligibility: (u: any, topN?: number) => any;
    allProfilesForMasters: any[];
    selectedMatchForScore: Match | null;
    setSelectedMatchForScore: (m: Match | null) => void;
    user: User;
    scoreSet1: { p1: string; p2: string };
    setScoreSet1: React.Dispatch<React.SetStateAction<{ p1: string; p2: string }>>;
    scoreSet2: { p1: string; p2: string };
    setScoreSet2: React.Dispatch<React.SetStateAction<{ p1: string; p2: string }>>;
    scoreSet3: { p1: string; p2: string };
    setScoreSet3: React.Dispatch<React.SetStateAction<{ p1: string; p2: string }>>;
    isSuperTiebreak: boolean;
    setIsSuperTiebreak: (val: boolean) => void;
    scoreError: string | null;
    savingScore: boolean;
    handleResetScore: () => void;
    handleSaveScore: () => void;
    handleDisputeScore: (matchId: string, reason: string) => void;
    disputeMatchId: string | null;
    setDisputeMatchId: (id: string | null) => void;
    h2hPlayers: { p1Id: string; p2Id: string } | null;
    setH2hPlayers: (val: { p1Id: string; p2Id: string } | null) => void;
    showFixtureModal: boolean;
    setShowFixtureModal: (show: boolean) => void;
    fixtureNumGroups: number;
    setFixtureNumGroups: (num: number) => void;
    handleShufflePreview: (num: number) => void;
    previewZones: any[];
    setPreviewZones: (zones: any[]) => void;
    handleConfirmCustomFixture: () => void;
    generatingFixture: boolean;
    showReplacePlayerModal: boolean;
    setShowReplacePlayerModal: (show: boolean) => void;
    playerToReplace: TournamentPlayer | null;
    replaceMode: 'registered' | 'guest';
    setReplaceMode: (mode: 'registered' | 'guest') => void;
    searchReplaceUserQuery: string;
    setSearchReplaceUserQuery: (q: string) => void;
    selectedUserForReplace: any;
    setSelectedUserForReplace: (u: any) => void;
    guestReplaceName: string;
    setGuestReplaceName: (n: string) => void;
    guestReplacePartnerName: string;
    setGuestReplacePartnerName: (n: string) => void;
    replaceCategory: string;
    setReplaceCategory: (c: string) => void;
    handleReplacePlayerSubmit: () => void;
    isSubmittingReplace: boolean;
    selectedMatchForSchedule: Match | null;
    setSelectedMatchForSchedule: (m: Match | null) => void;
    scheduleDate: string;
    setScheduleDate: (d: string) => void;
    scheduleTime: string;
    setScheduleTime: (t: string) => void;
    scheduleCourtName: string;
    setScheduleCourtName: (c: string) => void;
    scheduleOrderTurn: string;
    setScheduleOrderTurn: (t: string) => void;
    scheduleNotes: string;
    setScheduleNotes: (n: string) => void;
    courtBookings: Booking[];
    conflictError: string | null;
    overrideConflict: boolean;
    setOverrideConflict: (o: boolean) => void;
    savingSchedule: boolean;
    clearingSchedule: boolean;
    allCourts: any[];
    getQuickDatePresets: () => Array<{ label: string; dateStr: string }>;
    openCalendarPicker: () => void;
    handleSaveSchedule: () => void;
    handleClearSchedule: (matchId: string) => void;
    showRainDelayModal: boolean;
    setShowRainDelayModal: (show: boolean) => void;
    rainDelayHours: number;
    setRainDelayHours: React.Dispatch<React.SetStateAction<number>>;
    rainDelayNote: string;
    setRainDelayNote: (n: string) => void;
    handleApplyRainDelay: () => void;
    isApplyingDelay: boolean;
    formatFullDateDisplay: (d: string) => string;
    selectedOopDate: string;
    showCalendarPicker: boolean;
    setShowCalendarPicker: (show: boolean) => void;
    calendarViewDate: Date;
    handlePrevMonth: () => void;
    handleNextMonth: () => void;
    renderCalendarGrid: () => React.ReactNode;
    showDeleteModal: boolean;
    setShowDeleteModal: (show: boolean) => void;
    handleDeleteTournament: () => void;
    isDeletingTournament: boolean;
    showGraphicModal: boolean;
    setShowGraphicModal: (show: boolean) => void;
    matches: Match[];
    showEditTournamentModal: boolean;
    setShowEditTournamentModal: (show: boolean) => void;
    editTournamentStartDate: string;
    setEditTournamentStartDate: (d: string) => void;
    editTournamentEndDate: string;
    setEditTournamentEndDate: (d: string) => void;
    editTournamentCategory: string;
    setEditTournamentCategory: (c: string) => void;
    editTournamentGender: string;
    setEditTournamentGender: (g: string) => void;
    editTournamentEntryFee: number;
    setEditTournamentEntryFee: (f: number) => void;
    editTournamentEntryFeeMember: number;
    setEditTournamentEntryFeeMember: (f: number) => void;
    editTournamentCompetitionFormat: string;
    setEditTournamentCompetitionFormat: (f: string) => void;
    editTournamentMinMatches: number;
    setEditTournamentMinMatches: (m: number) => void;
    handleSaveEditTournament: () => void;
    isUpdatingTournament: boolean;
    showEnrollModal: boolean;
    setShowEnrollModal: (show: boolean) => void;
    isDoubles: boolean;
    userCategory: string;
    hasPartner: boolean;
    setHasPartner: (h: boolean) => void;
    partnerMode: 'registered' | 'guest';
    setPartnerMode: (m: 'registered' | 'guest') => void;
    searchPartnerQuery: string;
    setSearchPartnerQuery: (q: string) => void;
    selectedPartnerUser: any;
    setSelectedPartnerUser: (u: any) => void;
    partnerGuestName: string;
    setPartnerGuestName: (n: string) => void;
    partnerCategory: string;
    setPartnerCategory: (c: string) => void;
    partnerPaymentMethod: 'split' | 'single';
    setPartnerPaymentMethod: (m: 'split' | 'single') => void;
    enrollmentReceiptFile: File | null;
    receiptPreviewUrl: string | null;
    handleEnrollmentReceiptChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    availabilityNotes: string;
    setAvailabilityNotes: (n: string) => void;
    handleConfirmPlayerEnroll: () => void;
    effectivePrice: number;
    isClubAdmin: boolean;
    showEnrolledModal: boolean;
    setShowEnrolledModal: (show: boolean) => void;
    handleTogglePaymentStatus: (playerId: string, current: string) => void;
    handleUnenrollPlayer: (playerId: string, name: string) => void;
    exportTournamentPlayersToCSV: (t: Tournament, p: TournamentPlayer[], profMap: any) => void;
    addToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
    showOfficializeModal: boolean;
    setShowOfficializeModal: (show: boolean) => void;
    officializeOption: 'unified' | 'traditional';
    setOfficializeOption: (opt: 'unified' | 'traditional') => void;
    handleConfirmOfficialPlayoffs: () => void;
    unplayedGroupMatches: Match[];
    totalGroupMatchesCount: number;
    showProjectionHelpModal: boolean;
    setShowProjectionHelpModal: (show: boolean) => void;
    quickScorerMatch: Match | null;
    setQuickScorerMatch: (m: Match | null) => void;
    handleQuickSaveScore: (mId: string, s1: string, s2: string, s3: string, wId: string) => void;
    viewingReceiptModal: string | null;
    setViewingReceiptModal: (url: string | null) => void;
}

export const TournamentModalsContainer: React.FC<TournamentModalsContainerProps> = (props) => {
    const {
        showManualEnrollModal,
        setShowManualEnrollModal,
        tournament,
        players,
        allProfiles,
        loadingProfiles,
        enrollMode,
        setEnrollMode,
        searchUserQuery,
        setSearchUserQuery,
        filterByGender,
        setFilterByGender,
        selectedUserForEnroll,
        setSelectedUserForEnroll,
        guestName,
        setGuestName,
        guestPartnerName,
        setGuestPartnerName,
        guestCategory,
        setGuestCategory,
        manualFee,
        setManualFee,
        manualPaymentStatus,
        setManualPaymentStatus,
        manualAvailabilityNotes,
        setManualAvailabilityNotes,
        handleManualEnrollSubmit,
        submittingEnroll,
        matchTournamentGender,
        getUserMasterEligibility,
        allProfilesForMasters,
        selectedMatchForScore,
        setSelectedMatchForScore,
        user,
        scoreSet1,
        setScoreSet1,
        scoreSet2,
        setScoreSet2,
        scoreSet3,
        setScoreSet3,
        isSuperTiebreak,
        setIsSuperTiebreak,
        scoreError,
        savingScore,
        handleResetScore,
        handleSaveScore,
        handleDisputeScore,
        disputeMatchId,
        setDisputeMatchId,
        h2hPlayers,
        setH2hPlayers,
        showFixtureModal,
        setShowFixtureModal,
        fixtureNumGroups,
        setFixtureNumGroups,
        handleShufflePreview,
        previewZones,
        setPreviewZones,
        handleConfirmCustomFixture,
        generatingFixture,
        showReplacePlayerModal,
        setShowReplacePlayerModal,
        playerToReplace,
        replaceMode,
        setReplaceMode,
        searchReplaceUserQuery,
        setSearchReplaceUserQuery,
        selectedUserForReplace,
        setSelectedUserForReplace,
        guestReplaceName,
        setGuestReplaceName,
        guestReplacePartnerName,
        setGuestReplacePartnerName,
        replaceCategory,
        setReplaceCategory,
        handleReplacePlayerSubmit,
        isSubmittingReplace,
        selectedMatchForSchedule,
        setSelectedMatchForSchedule,
        scheduleDate,
        setScheduleDate,
        scheduleTime,
        setScheduleTime,
        scheduleCourtName,
        setScheduleCourtName,
        scheduleOrderTurn,
        setScheduleOrderTurn,
        scheduleNotes,
        setScheduleNotes,
        courtBookings,
        conflictError,
        overrideConflict,
        setOverrideConflict,
        savingSchedule,
        clearingSchedule,
        allCourts,
        getQuickDatePresets,
        openCalendarPicker,
        handleSaveSchedule,
        handleClearSchedule,
        showRainDelayModal,
        setShowRainDelayModal,
        rainDelayHours,
        setRainDelayHours,
        rainDelayNote,
        setRainDelayNote,
        handleApplyRainDelay,
        isApplyingDelay,
        formatFullDateDisplay,
        selectedOopDate,
        showCalendarPicker,
        setShowCalendarPicker,
        calendarViewDate,
        handlePrevMonth,
        handleNextMonth,
        renderCalendarGrid,
        showDeleteModal,
        setShowDeleteModal,
        handleDeleteTournament,
        isDeletingTournament,
        showGraphicModal,
        setShowGraphicModal,
        matches,
        showEditTournamentModal,
        setShowEditTournamentModal,
        editTournamentStartDate,
        setEditTournamentStartDate,
        editTournamentEndDate,
        setEditTournamentEndDate,
        editTournamentCategory,
        setEditTournamentCategory,
        editTournamentGender,
        setEditTournamentGender,
        editTournamentEntryFee,
        setEditTournamentEntryFee,
        editTournamentEntryFeeMember,
        setEditTournamentEntryFeeMember,
        editTournamentCompetitionFormat,
        setEditTournamentCompetitionFormat,
        editTournamentMinMatches,
        setEditTournamentMinMatches,
        handleSaveEditTournament,
        isUpdatingTournament,
        showEnrollModal,
        setShowEnrollModal,
        isDoubles,
        userCategory,
        hasPartner,
        setHasPartner,
        partnerMode,
        setPartnerMode,
        searchPartnerQuery,
        setSearchPartnerQuery,
        selectedPartnerUser,
        setSelectedPartnerUser,
        partnerGuestName,
        setPartnerGuestName,
        partnerCategory,
        setPartnerCategory,
        partnerPaymentMethod,
        setPartnerPaymentMethod,
        enrollmentReceiptFile,
        receiptPreviewUrl,
        handleEnrollmentReceiptChange,
        availabilityNotes,
        setAvailabilityNotes,
        handleConfirmPlayerEnroll,
        effectivePrice,
        isClubAdmin,
        showEnrolledModal,
        setShowEnrolledModal,
        handleTogglePaymentStatus,
        handleUnenrollPlayer,
        exportTournamentPlayersToCSV,
        addToast,
        showOfficializeModal,
        setShowOfficializeModal,
        officializeOption,
        setOfficializeOption,
        handleConfirmOfficialPlayoffs,
        unplayedGroupMatches,
        totalGroupMatchesCount,
        showProjectionHelpModal,
        setShowProjectionHelpModal,
        quickScorerMatch,
        setQuickScorerMatch,
        handleQuickSaveScore,
        viewingReceiptModal,
        setViewingReceiptModal,
    } = props;

    return (
        <>
                        {/* MANUAL ENROLL MODAL */}
            {showManualEnrollModal && (
                <ManualEnrollModal
                    isOpen={showManualEnrollModal}
                    onClose={() => setShowManualEnrollModal(false)}
                    tournament={tournament}
                    players={players}
                    allProfiles={allProfiles}
                    loadingProfiles={loadingProfiles}
                    enrollMode={enrollMode}
                    onEnrollModeChange={setEnrollMode}
                    searchUserQuery={searchUserQuery}
                    onSearchUserQueryChange={setSearchUserQuery}
                    filterByGender={filterByGender}
                    onToggleFilterByGender={() => setFilterByGender(!filterByGender)}
                    selectedUserForEnroll={selectedUserForEnroll}
                    onSelectUserForEnroll={setSelectedUserForEnroll}
                    guestName={guestName}
                    onGuestNameChange={setGuestName}
                    guestPartnerName={guestPartnerName}
                    onGuestPartnerNameChange={setGuestPartnerName}
                    guestCategory={guestCategory}
                    onGuestCategoryChange={setGuestCategory}
                    manualFee={manualFee}
                    onManualFeeChange={setManualFee}
                    manualPaymentStatus={manualPaymentStatus}
                    onManualPaymentStatusChange={setManualPaymentStatus}
                    manualAvailabilityNotes={manualAvailabilityNotes}
                    onManualAvailabilityNotesChange={setManualAvailabilityNotes}
                    onSubmit={handleManualEnrollSubmit}
                    submitting={submittingEnroll}
                    matchTournamentGender={matchTournamentGender}
                    getUserMasterEligibility={getUserMasterEligibility}
                    allProfilesForMasters={allProfilesForMasters}
                />
            )}

            {/* SCORE INPUT MODAL */}
            {selectedMatchForScore && (
                <ScoreInputModal
                    isOpen={!!selectedMatchForScore}
                    onClose={() => setSelectedMatchForScore(null)}
                    match={selectedMatchForScore}
                    isClubAdmin={isClubAdmin}
                    isWalkover={isWalkover}
                    onToggleWalkover={setIsWalkover}
                    walkoverWinnerId={walkoverWinnerId}
                    onWalkoverWinnerIdChange={setWalkoverWinnerId}
                    scoreP1Set1={scoreP1Set1}
                    onScoreP1Set1Change={setScoreP1Set1}
                    scoreP2Set1={scoreP2Set1}
                    onScoreP2Set1Change={setScoreP2Set1}
                    tbP1Set1={tbP1Set1}
                    onTbP1Set1Change={setTbP1Set1}
                    tbP2Set1={tbP2Set1}
                    onTbP2Set1Change={setTbP2Set1}
                    scoreP1Set2={scoreP1Set2}
                    onScoreP1Set2Change={setScoreP1Set2}
                    scoreP2Set2={scoreP2Set2}
                    onScoreP2Set2Change={setScoreP2Set2}
                    tbP1Set2={tbP1Set2}
                    onTbP1Set2Change={setTbP1Set2}
                    tbP2Set2={tbP2Set2}
                    onTbP2Set2Change={setTbP2Set2}
                    hasSet3={hasSet3}
                    onAddSet3={() => {
                        setHasSet3(true);
                        setIsSet3SuperTiebreak(true);
                        setScoreP1Set3('');
                        setScoreP2Set3('');
                    }}
                    onRemoveSet3={() => {
                        setHasSet3(false);
                        setScoreP1Set3('');
                        setScoreP2Set3('');
                        setTbP1Set3('');
                        setTbP2Set3('');
                    }}
                    isSet3SuperTiebreak={isSet3SuperTiebreak}
                    onSetIsSet3SuperTiebreak={setIsSet3SuperTiebreak}
                    scoreP1Set3={scoreP1Set3}
                    onScoreP1Set3Change={setScoreP1Set3}
                    scoreP2Set3={scoreP2Set3}
                    onScoreP2Set3Change={setScoreP2Set3}
                    tbP1Set3={tbP1Set3}
                    onTbP1Set3Change={setTbP1Set3}
                    tbP2Set3={tbP2Set3}
                    onTbP2Set3Change={setTbP2Set3}
                    computedWinnerInfo={computedWinnerInfo}
                    onResetScore={handleResetScore}
                    onSaveScore={handleSaveScore}
                    savingScore={savingScore}
                />
            )}

            {/* DISPUTE MODAL */}
            {disputeMatchId && (
                <DisputeModal
                    isOpen={!!disputeMatchId}
                    onClose={() => setDisputeMatchId(null)}
                    disputeReason={disputeReason}
                    onDisputeReasonChange={setDisputeReason}
                    onSubmit={handleDisputeScore}
                    submitting={submittingDispute}
                />
            )}

            {/* HEAD TO HEAD (H2H) MODAL */}
            {h2hPlayers && (
                <HeadToHeadModal
                    player1Id={h2hPlayers.p1Id}
                    player2Id={h2hPlayers.p2Id}
                    onClose={() => setH2hPlayers(null)}
                />
            )}

            {/* GENERATE FIXTURE MODAL */}
            {showFixtureModal && tournament && (
                <GenerateFixtureModal
                    isOpen={showFixtureModal}
                    onClose={() => setShowFixtureModal(false)}
                    tournament={tournament}
                    players={players}
                    fixtureNumGroups={fixtureNumGroups}
                    onNumGroupsChange={setFixtureNumGroups}
                    onShufflePreview={handleShufflePreview}
                    previewGroups={previewGroups}
                    onConfirmFixture={handleConfirmCustomFixture}
                    generatingFixture={generatingFixture}
                />
            )}

            {/* REPLACE / SUBSTITUTE PLAYER MODAL */}
            {playerToReplace && (
                <ReplacePlayerModal
                    isOpen={!!playerToReplace}
                    onClose={() => setPlayerToReplace(null)}
                    tournament={tournament}
                    playerToReplace={playerToReplace}
                    replaceMode={replaceMode}
                    onReplaceModeChange={setReplaceMode}
                    allProfiles={allProfiles}
                    loadingProfiles={loadingProfiles}
                    searchUserReplaceQuery={searchUserReplaceQuery}
                    onSearchUserReplaceQueryChange={setSearchUserReplaceQuery}
                    selectedUserForReplace={selectedUserForReplace}
                    onSelectUserForReplace={setSelectedUserForReplace}
                    replaceGuestName={replaceGuestName}
                    onReplaceGuestNameChange={setReplaceGuestName}
                    replacePartnerMode={replacePartnerMode}
                    onReplacePartnerModeChange={setReplacePartnerMode}
                    searchPartnerReplaceQuery={searchPartnerReplaceQuery}
                    onSearchPartnerReplaceQueryChange={setSearchPartnerReplaceQuery}
                    selectedPartnerForReplace={selectedPartnerForReplace}
                    onSelectPartnerForReplace={setSelectedPartnerForReplace}
                    replaceGuestPartnerName={replaceGuestPartnerName}
                    onReplaceGuestPartnerNameChange={setReplaceGuestPartnerName}
                    replaceCategory={replaceCategory}
                    onReplaceCategoryChange={setReplaceCategory}
                    filterByGender={filterByGender}
                    onToggleFilterByGender={() => setFilterByGender(!filterByGender)}
                    matchTournamentGender={matchTournamentGender}
                    onSubmit={handleReplacePlayerSubmit}
                    isSubmitting={isSubmittingReplace}
                    players={players}
                />
            )}

            {/* SCHEDULE MATCH MODAL (Organizador) */}
            {selectedMatchForSchedule && (
                <ScheduleMatchModal
                    isOpen={!!selectedMatchForSchedule}
                    onClose={() => setSelectedMatchForSchedule(null)}
                    tournament={tournament}
                    match={selectedMatchForSchedule}
                    players={players}
                    scheduleDate={scheduleDate}
                    onScheduleDateChange={setScheduleDate}
                    onOpenCalendarPicker={openCalendarPicker}
                    quickDatePresets={getQuickDatePresets()}
                    formatFullDateDisplay={formatFullDateDisplay}
                    scheduleTime={scheduleTime}
                    onScheduleTimeChange={setScheduleTime}
                    isCustomCourt={isCustomCourt}
                    onToggleCustomCourt={() => setIsCustomCourt(!isCustomCourt)}
                    customCourtName={customCourtName}
                    onCustomCourtNameChange={setCustomCourtName}
                    scheduleCourt={scheduleCourt}
                    onScheduleCourtChange={setScheduleCourt}
                    courtOptions={courtOptions}
                    conflictBooking={conflictBooking}
                    availableCourtsAtThisTime={availableCourtsAtThisTime}
                    overrideConflict={overrideConflict}
                    onOverrideConflictChange={setOverrideConflict}
                    loadingDayBookings={loadingDayBookings}
                    currentTargetCourt={currentTargetCourt}
                    scheduleOopTurn={scheduleOopTurn}
                    onScheduleOopTurnChange={setScheduleOopTurn}
                    scheduleOopNote={scheduleOopNote}
                    onScheduleOopNoteChange={setScheduleOopNote}
                    onClearSchedule={handleClearSchedule}
                    onSaveSchedule={handleSaveSchedule}
                    savingSchedule={savingSchedule}
                />
            )}

            {/* RAIN / CLIMATE DELAY MODAL */}
            {showRainDelayModal && (
                <RainDelayModal
                    isOpen={showRainDelayModal}
                    onClose={() => setShowRainDelayModal(false)}
                    selectedOopDate={selectedOopDate}
                    formatFullDateDisplay={formatFullDateDisplay}
                    unplayedMatchesCount={oopDateMatches.filter(m => !m.is_played).length}
                    rainDelayMinutes={rainDelayMinutes}
                    onSelectRainDelayMinutes={setRainDelayMinutes}
                    onApplyRainDelay={handleApplyRainDelay}
                    isApplyingRainDelay={isApplyingRainDelay}
                />
            )}

            {/* INTERACTIVE CALENDAR DATE PICKER MODAL */}
            {showCalendarModal && (
                <CalendarPickerModal
                    isOpen={showCalendarModal}
                    onClose={() => setShowCalendarModal(false)}
                    calendarViewMonth={calendarViewMonth}
                    onPrevMonth={handlePrevMonth}
                    onNextMonth={handleNextMonth}
                    onGoToToday={() => {
                        const today = new Date();
                        setCalendarViewMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                        handleSelectCalendarDate(today.toISOString().split('T')[0]);
                    }}
                    startDate={tournament?.start_date}
                    onSelectTournamentStartDate={() => {
                        if (!tournament?.start_date) return;
                        const [y, m] = tournament.start_date.split('-').map(Number);
                        setCalendarViewMonth(new Date(y, m - 1, 1));
                        handleSelectCalendarDate(tournament.start_date);
                    }}
                    scheduleDate={scheduleDate}
                    onSelectDate={handleSelectCalendarDate}
                    calendarCells={renderCalendarGrid()}
                    formatFullDateDisplay={formatFullDateDisplay}
                />
            )}

            {/* DELETE TOURNAMENT CONFIRMATION MODAL */}
            {showDeleteModal && tournament && (
                <DeleteTournamentModal
                    isOpen={showDeleteModal}
                    onClose={() => setShowDeleteModal(false)}
                    tournament={tournament}
                    playersCount={players.length}
                    matchesCount={matches.length}
                    onConfirm={handleDeleteTournament}
                    isDeleting={isDeletingTournament}
                />
            )}

            {/* SOCIAL MEDIA GRAPHIC GENERATOR MODAL */}
            {showGraphicModal && tournament && (
                <ShareGraphicModal
                    isOpen={showGraphicModal}
                    onClose={() => setShowGraphicModal(false)}
                    tournament={tournament}
                    zones={zones}
                    playoffRounds={playoffRounds}
                    championName={tournament.champion_name}
                    matches={matches}
                    currentUser={user}
                />
            )}

            {/* EDIT TOURNAMENT MODAL (Organizador & Superadmin) */}
            {showEditTournamentModal && tournament && (
                <EditTournamentModal
                    isOpen={showEditTournamentModal}
                    onClose={() => setShowEditTournamentModal(false)}
                    tournament={tournament}
                    formData={editTournamentForm}
                    onFormChange={setEditTournamentForm}
                    onSubmit={handleSaveEditTournament}
                    isUpdating={isUpdatingTournament}
                />
            )}

            {/* PLAYER ENROLLMENT CONFIRMATION & AVAILABILITY MODAL */}
            {showPlayerEnrollModal && tournament && (
                <PlayerEnrollModal
                    isOpen={showPlayerEnrollModal}
                    onClose={() => setShowPlayerEnrollModal(false)}
                    tournament={tournament}
                    user={user}
                    effectivePrice={effectivePrice}
                    hostInstitution={hostInstitution}
                    copiedAlias={copiedAlias}
                    onCopyAlias={() => {
                        const val = hostInstitution?.alias_mp || hostInstitution?.cvu_mp || '';
                        navigator.clipboard.writeText(val);
                        setCopiedAlias(true);
                        setTimeout(() => setCopiedAlias(false), 3000);
                        addToast("¡Alias copiado al portapapeles!", 'success');
                    }}
                    enrollmentReceiptImage={enrollmentReceiptImage}
                    onReceiptImageChange={handleEnrollmentReceiptChange}
                    onRemoveReceiptImage={() => setEnrollmentReceiptImage(null)}
                    onViewReceipt={url => setViewingReceiptModal(url)}
                    playerAvailabilityNotes={playerAvailabilityNotes}
                    onAvailabilityNotesChange={setPlayerAvailabilityNotes}
                    onToggleAvailabilityChip={chip => {
                        if (playerAvailabilityNotes.includes(chip)) {
                            setPlayerAvailabilityNotes(prev => prev.replace(chip, '').replace(/^,\s*|,\s*$/g, '').trim());
                        } else {
                            setPlayerAvailabilityNotes(prev => prev ? `${prev}, ${chip}` : chip);
                        }
                    }}
                    onConfirmEnroll={handleConfirmPlayerEnroll}
                    isEnrolling={isEnrolling}
                />
            )}

            {/* MODAL DE JUGADORES INSCRIPTOS */}
            {showEnrolledModal && (
                <EnrolledPlayersModal
                    isOpen={showEnrolledModal}
                    onClose={() => setShowEnrolledModal(false)}
                    tournament={tournament}
                    players={players}
                    filteredPlayers={filteredEnrolledPlayers}
                    searchQuery={enrolledSearchQuery}
                    onSearchQueryChange={setEnrolledSearchQuery}
                    currentUser={user}
                    isClubAdmin={isClubAdmin}
                    onExportCSV={() => {
                        if (!tournament) return;
                        const profileMap: Record<string, any> = {};
                        allProfiles.forEach(prof => { profileMap[prof.id] = prof; });
                        exportTournamentPlayersToCSV(tournament, players, profileMap);
                        soundEffects.playScoreBeep();
                        addToast("¡Listado de inscriptos descargado en CSV!", "success");
                    }}
                    onOpenManualEnroll={() => {
                        setShowEnrolledModal(false);
                        openManualEnrollModal();
                    }}
                    onOpenReplaceModal={handleOpenReplaceModal}
                    onUnenrollPlayer={handleUnenrollPlayer}
                    onTogglePaymentStatus={handleTogglePaymentStatus}
                    onViewReceipt={url => setViewingReceiptModal(url)}
                    deletingPlayerId={deletingPlayerId}
                />
            )}

            {/* MODAL PARA OFICIALIZAR Y CONFIRMAR LLAVES */}
            {showOfficializeModal && (
                <OfficializeModal
                    isOpen={showOfficializeModal}
                    onClose={() => setShowOfficializeModal(false)}
                    unplayedGroupMatchesCount={unplayedGroupMatches.length}
                    zones={zones}
                    selectedOfficialFormat={selectedOfficialFormat}
                    onSelectOfficialFormat={setSelectedOfficialFormat}
                    allowByes={allowByes}
                    players={players}
                    onConfirm={handleConfirmOfficialPlayoffs}
                    generatingPlayoffs={generatingPlayoffs}
                />
            )}

            {/* MODAL EXPLICATIVO DE MÉTODOS DE PROYECCIÓN Y CRUCES */}
            {showProjectionHelpModal && (
                <ProjectionHelpModal
                    isOpen={showProjectionHelpModal}
                    onClose={() => setShowProjectionHelpModal(false)}
                />
            )}

            {/* Quick-Scorer Modal Ergonómico */}
            {selectedMatchForScore && showQuickScorer && (
                <MatchQuickScorerModal
                    isOpen={showQuickScorer}
                    onClose={() => {
                        setShowQuickScorer(false);
                        setSelectedMatchForScore(null);
                    }}
                    player1Name={selectedMatchForScore.team1_name || selectedMatchForScore.player1_name || 'Jugador 1'}
                    player2Name={selectedMatchForScore.team2_name || selectedMatchForScore.player2_name || 'Jugador 2'}
                    p1Id={selectedMatchForScore.player1_id}
                    p2Id={selectedMatchForScore.player2_id}
                    currentScore={selectedMatchForScore.score && typeof selectedMatchForScore.score === 'object' 
                        ? `${selectedMatchForScore.score.set1 || ''} ${selectedMatchForScore.score.set2 || ''} ${selectedMatchForScore.score.set3 || ''}`.trim()
                        : (selectedMatchForScore.score || '')
                    }
                    onSaveScore={handleQuickSaveScore}
                />
            )}

            {viewingReceiptModal && (
                <ReceiptViewerModal
                    receiptUrl={viewingReceiptModal}
                    onClose={() => setViewingReceiptModal(null)}
                />
            )}
        </>
    );
};
